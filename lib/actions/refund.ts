"use server"

import { z } from "zod"
import { eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aestheticCase, invoice, payment, refundRequest, creditNote } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, canAccessCase, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import Stripe from "stripe"
import { env, isStripeConfigured } from "@/lib/env"
import type { ActionResult } from "@/lib/actions/provider"

function ref(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
}

/* ── 1) Request a refund (patient or authorized staff) ──────────────────── */
const requestSchema = z.object({
  caseId: z.string().min(1),
  amount: z.coerce.number().positive().max(10_000_000),
  reason: z.string().min(5, "يرجى ذكر سبب الاسترجاع").max(1000),
})

export async function requestRefund(
  input: unknown,
): Promise<ActionResult<{ refundRequestId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.REFUND_REQUEST)
    const parsed = requestSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const c = (
      await db.select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId }).from(aestheticCase).where(eq(aestheticCase.id, data.caseId)).limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (c.patientUserId !== user.id && !(await canAccessCase(user.id, data.caseId))) throw forbidden()

    const inv = (
      await db.select().from(invoice).where(eq(invoice.caseId, data.caseId)).orderBy(desc(invoice.createdAt)).limit(1)
    )[0]
    if (!inv) throw conflict("لا توجد فاتورة لهذه الحالة.")
    if (Number(inv.paidAmount) <= 0) throw conflict("لا توجد مبالغ مدفوعة على هذه الفاتورة لاستردادها.")

    // sum of non-rejected/non-cancelled/non-failed requests already against this invoice
    const existing = await db.select().from(refundRequest).where(eq(refundRequest.invoiceId, inv.id))
    const alreadyRequestedOrProcessed = existing
      .filter((r) => !["REJECTED", "CANCELLED", "FAILED"].includes(r.status))
      .reduce((s, r) => s + Number(r.amount), 0)
    const availableToRefund = Number(inv.paidAmount) - alreadyRequestedOrProcessed
    if (data.amount > availableToRefund + 0.01)
      throw conflict(`أقصى مبلغ يمكن طلب استرجاعه حاليًا هو ${availableToRefund.toFixed(2)} ${inv.currency}.`)

    const latestPayment = (
      await db.select().from(payment).where(eq(payment.caseId, data.caseId)).orderBy(desc(payment.paidAt)).limit(1)
    )[0]

    const id = await db.transaction(async (tx) => {
      const row = await tx
        .insert(refundRequest)
        .values({
          invoiceId: inv.id,
          paymentId: latestPayment?.id,
          caseId: data.caseId,
          requestedByUserId: user.id,
          amount: data.amount.toFixed(2),
          reason: data.reason,
          status: "REQUESTED",
          createdBy: user.id,
        })
        .returning({ id: refundRequest.id })
      await writeAudit(
        { action: "refund.request", actorUserId: user.id, entityType: "refund_request", entityId: row[0].id, metadata: { caseId: data.caseId, amount: data.amount } },
        tx,
      )
      return row[0].id
    })

    revalidatePath(`/dashboard/cases/${data.caseId}`)
    revalidatePath("/dashboard/finance")
    return { ok: true, data: { refundRequestId: id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 2) Finance reviews: approve or reject ──────────────────────────────── */
const reviewSchema = z.object({
  refundRequestId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().max(1000).optional().default(""),
})

export async function reviewRefundRequest(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.REFUND_MANAGE)
    const parsed = reviewSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const r = (await db.select().from(refundRequest).where(eq(refundRequest.id, data.refundRequestId)).limit(1))[0]
    if (!r) throw new AppError("NOT_FOUND")
    if (!["REQUESTED", "UNDER_REVIEW"].includes(r.status))
      throw conflict("تمت مراجعة هذا الطلب بالفعل.")

    const nextStatus = data.decision === "approve" ? "APPROVED" : "REJECTED"
    await db.transaction(async (tx) => {
      await tx
        .update(refundRequest)
        .set({ status: nextStatus, reviewedBy: user.id, reviewedAt: new Date(), reviewNotes: data.notes || null })
        .where(eq(refundRequest.id, r.id))
      await writeAudit({ action: `refund.${data.decision}`, actorUserId: user.id, entityType: "refund_request", entityId: r.id }, tx)
    })

    await notify({
      userId: r.requestedByUserId,
      type: `refund.${data.decision}`,
      title: data.decision === "approve" ? "تمت الموافقة على طلب الاسترجاع" : "تم رفض طلب الاسترجاع",
      body: data.notes || undefined,
      caseId: r.caseId,
      href: `/dashboard/cases/${r.caseId}`,
    })
    revalidatePath("/dashboard/finance")
    revalidatePath(`/dashboard/cases/${r.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 3) Provider (center/doctor) confirms — required before processing ──── */
export async function providerConfirmRefund(refundRequestId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const r = (await db.select().from(refundRequest).where(eq(refundRequest.id, refundRequestId)).limit(1))[0]
    if (!r) throw new AppError("NOT_FOUND")
    if (!(await canAccessCase(user.id, r.caseId))) throw forbidden()
    if (r.status !== "APPROVED") throw conflict("يجب اعتماد الطلب من المالية أولًا.")

    await db.transaction(async (tx) => {
      await tx
        .update(refundRequest)
        .set({ status: "PROVIDER_CONFIRMED", providerConfirmedBy: user.id, providerConfirmedAt: new Date() })
        .where(eq(refundRequest.id, r.id))
      await writeAudit({ action: "refund.provider_confirm", actorUserId: user.id, entityType: "refund_request", entityId: r.id }, tx)
    })
    revalidatePath("/dashboard/finance")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 4) Finance processes: real Stripe refund + credit note ─────────────── */
export async function processRefund(refundRequestId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.REFUND_MANAGE)

    const r = (await db.select().from(refundRequest).where(eq(refundRequest.id, refundRequestId)).limit(1))[0]
    if (!r) throw new AppError("NOT_FOUND")
    if (r.status === "PROCESSED") return { ok: true } // idempotent no-op
    if (!["APPROVED", "PROVIDER_CONFIRMED"].includes(r.status))
      throw conflict("هذا الطلب غير جاهز للمعالجة.")

    const inv = (await db.select().from(invoice).where(eq(invoice.id, r.invoiceId)).limit(1))[0]
    if (!inv) throw new AppError("NOT_FOUND")
    if (Number(r.amount) > Number(inv.paidAmount) + 0.01)
      throw conflict("مبلغ الاسترجاع يتجاوز المبلغ المدفوع فعليًا.")

    let providerRefundId: string | null = null
    if (isStripeConfigured() && r.paymentId) {
      const pay = (await db.select().from(payment).where(eq(payment.id, r.paymentId)).limit(1))[0]
      if (pay?.providerIntentId) {
        try {
          const stripe = new Stripe(env.STRIPE_SECRET_KEY as string)
          const refund = await stripe.refunds.create({
            payment_intent: pay.providerIntentId,
            amount: Math.round(Number(r.amount) * 100),
          })
          providerRefundId = refund.id
        } catch (err) {
          await db
            .update(refundRequest)
            .set({ status: "FAILED", failureReason: err instanceof Error ? err.message : "Stripe refund failed" })
            .where(eq(refundRequest.id, r.id))
          throw conflict("تعذّرت معالجة الاسترجاع عبر بوابة الدفع. راجع سجل الفشل.")
        }
      }
    }

    await db.transaction(async (tx) => {
      const cn = await tx
        .insert(creditNote)
        .values({
          creditNoteNumber: ref("CN"),
          invoiceId: inv.id,
          amount: r.amount,
          reason: r.reason,
          createdBy: user.id,
        })
        .returning({ id: creditNote.id })

      const newPaid = Math.max(0, Number(inv.paidAmount) - Number(r.amount))
      const fullyRefunded = newPaid <= 0.01
      await tx
        .update(invoice)
        .set({
          paidAmount: newPaid.toFixed(2),
          status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
        })
        .where(eq(invoice.id, inv.id))

      if (r.paymentId) {
        await tx
          .update(payment)
          .set({ status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" })
          .where(eq(payment.id, r.paymentId))
      }

      await tx
        .update(refundRequest)
        .set({
          status: "PROCESSED",
          creditNoteId: cn[0].id,
          providerRefundId,
          processedAt: new Date(),
        })
        .where(eq(refundRequest.id, r.id))

      await writeAudit(
        { action: "refund.process", actorUserId: user.id, entityType: "refund_request", entityId: r.id, metadata: { amount: r.amount, providerRefundId } },
        tx,
      )
    })

    await notify({
      userId: r.requestedByUserId,
      type: "refund.processed",
      title: "تم استرجاع المبلغ",
      body: `تم استرجاع ${r.amount} ${inv.currency}.`,
      caseId: r.caseId,
      href: `/dashboard/cases/${r.caseId}`,
    })
    revalidatePath("/dashboard/finance")
    revalidatePath(`/dashboard/cases/${r.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
