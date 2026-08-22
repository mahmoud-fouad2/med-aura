"use server"

import { z } from "zod"
import { and, desc, eq, isNotNull, lt, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aestheticCase, invoice, payment, refundRequest, creditNote } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import {
  requirePermission,
  canAccessCase,
  getUserRoles,
  PERMISSIONS,
  ROLES,
  type RoleKey,
} from "@/lib/rbac"
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

    const initialInvoice = (
      await db.select().from(invoice).where(eq(invoice.caseId, data.caseId)).orderBy(desc(invoice.createdAt)).limit(1)
    )[0]
    if (!initialInvoice) throw conflict("لا توجد فاتورة لهذه الحالة.")

    const id = await db.transaction(async (tx) => {
      // Serialize all refund reservations for this invoice. Without the lock,
      // two requests can both observe the same available balance and exceed it.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${initialInvoice.id}, 0))`,
      )
      const inv = (
        await tx.select().from(invoice).where(eq(invoice.id, initialInvoice.id)).limit(1)
      )[0]
      if (!inv || Number(inv.paidAmount) <= 0) {
        throw conflict("لا توجد مبالغ مدفوعة على هذه الفاتورة لاستردادها.")
      }

      const existing = await tx
        .select()
        .from(refundRequest)
        .where(eq(refundRequest.invoiceId, inv.id))
      const reserved = existing
        .filter((row) => !["REJECTED", "CANCELLED", "FAILED"].includes(row.status))
        .reduce((sum, row) => sum + Number(row.amount), 0)
      const available = Number(inv.paidAmount) - reserved
      if (data.amount > available + 0.01) {
        throw conflict(
          `أقصى مبلغ يمكن طلب استرجاعه حاليًا هو ${available.toFixed(2)} ${inv.currency}.`,
        )
      }

      const latestPayment = (
        await tx
          .select()
          .from(payment)
          .where(eq(payment.caseId, data.caseId))
          .orderBy(desc(payment.paidAt))
          .limit(1)
      )[0]
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
    revalidatePath("/admin/finance")
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
      const updated = await tx
        .update(refundRequest)
        .set({ status: nextStatus, reviewedBy: user.id, reviewedAt: new Date(), reviewNotes: data.notes || null })
        .where(
          and(
            eq(refundRequest.id, r.id),
            or(
              eq(refundRequest.status, "REQUESTED"),
              eq(refundRequest.status, "UNDER_REVIEW"),
            ),
          ),
        )
        .returning({ id: refundRequest.id })
      if (updated.length === 0) {
        throw conflict("تغيّرت حالة طلب الاسترجاع. حدّث الصفحة.")
      }
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
    revalidatePath("/admin/finance")
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
    const roles = await getUserRoles(user.id)
    const providerRoles = new Set<RoleKey>([
      ROLES.DOCTOR,
      ROLES.CENTER_OWNER,
      ROLES.CENTER_ADMIN,
      ROLES.CENTER_STAFF,
    ])
    if (!roles.some((role) => providerRoles.has(role))) throw forbidden()
    const r = (await db.select().from(refundRequest).where(eq(refundRequest.id, refundRequestId)).limit(1))[0]
    if (!r) throw new AppError("NOT_FOUND")
    if (!(await canAccessCase(user.id, r.caseId))) throw forbidden()
    if (r.status !== "APPROVED") throw conflict("يجب اعتماد الطلب من المالية أولًا.")

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(refundRequest)
        .set({ status: "PROVIDER_CONFIRMED", providerConfirmedBy: user.id, providerConfirmedAt: new Date() })
        .where(and(eq(refundRequest.id, r.id), eq(refundRequest.status, "APPROVED")))
        .returning({ id: refundRequest.id })
      if (updated.length === 0) throw conflict("تغيّرت حالة طلب الاسترجاع. حدّث الصفحة.")
      await writeAudit({ action: "refund.provider_confirm", actorUserId: user.id, entityType: "refund_request", entityId: r.id }, tx)
    })
    revalidatePath("/dashboard/finance")
    revalidatePath("/admin/finance")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 4) Finance processes: real Stripe refund + credit note ─────────────── */
export async function processRefund(refundRequestId: string): Promise<ActionResult> {
  let activeClaimId: string | null = null
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.REFUND_MANAGE)

    const existing = (
      await db.select().from(refundRequest).where(eq(refundRequest.id, refundRequestId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")
    if (existing.status === "PROCESSED") return { ok: true }

    const staleProcessing = new Date(Date.now() - 5 * 60_000)
    const claimed = await db
      .update(refundRequest)
      .set({
        status: "PROCESSING",
        processingStartedAt: new Date(),
        failureReason: null,
      })
      .where(
        and(
          eq(refundRequest.id, refundRequestId),
          or(
            eq(refundRequest.status, "PROVIDER_CONFIRMED"),
            and(
              eq(refundRequest.status, "FAILED"),
              isNotNull(refundRequest.providerConfirmedAt),
            ),
            and(
              eq(refundRequest.status, "PROCESSING"),
              lt(refundRequest.processingStartedAt, staleProcessing),
            ),
          ),
        ),
      )
      .returning()

    if (claimed.length === 0) {
      throw conflict("طلب الاسترجاع قيد المعالجة أو لم يعد جاهزًا.")
    }
    const r = claimed[0]
    activeClaimId = r.id

    const inv = (await db.select().from(invoice).where(eq(invoice.id, r.invoiceId)).limit(1))[0]
    if (!inv) throw new AppError("NOT_FOUND")
    if (Number(r.amount) > Number(inv.paidAmount) + 0.01)
      throw conflict("مبلغ الاسترجاع يتجاوز المبلغ المدفوع فعليًا.")

    let providerRefundId: string | null = r.providerRefundId
    if (r.paymentId) {
      const pay = (await db.select().from(payment).where(eq(payment.id, r.paymentId)).limit(1))[0]
      if (pay?.provider === "stripe") {
        if (!isStripeConfigured() || !pay.providerIntentId) {
          await failRefundClaim(r.id, "Stripe payment is missing refund configuration or intent")
          activeClaimId = null
          throw conflict("بيانات بوابة الدفع غير مكتملة لهذه العملية. راجع المطابقة المالية.")
        }
        try {
          const stripe = new Stripe(env.STRIPE_SECRET_KEY as string)
          const refund = await stripe.refunds.create(
            {
              payment_intent: pay.providerIntentId,
              amount: Math.round(Number(r.amount) * 100),
            },
            { idempotencyKey: `medaura-refund-${r.id}` },
          )
          providerRefundId = refund.id
        } catch (err) {
          await failRefundClaim(
            r.id,
            err instanceof Error ? err.message : "Stripe refund failed",
          )
          activeClaimId = null
          throw conflict("تعذّرت معالجة الاسترجاع عبر بوابة الدفع. راجع سجل الفشل.")
        }
      }
    }

    const finalization = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${r.id}, 0))`,
      )
      const currentRequest = (
        await tx
          .select({ status: refundRequest.status })
          .from(refundRequest)
          .where(eq(refundRequest.id, r.id))
          .limit(1)
      )[0]
      if (currentRequest?.status === "PROCESSED") return "already_processed" as const
      if (currentRequest?.status !== "PROCESSING") {
        throw conflict("تغيّرت حالة طلب الاسترجاع قبل إتمام المعالجة.")
      }

      // Approved refunds for the same invoice may reach Stripe in parallel.
      // Serialize accounting and recompute from the latest committed balance.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${inv.id}, 0))`,
      )
      const currentInvoice = (
        await tx.select().from(invoice).where(eq(invoice.id, inv.id)).limit(1)
      )[0]
      if (!currentInvoice || Number(r.amount) > Number(currentInvoice.paidAmount) + 0.01) {
        throw conflict("رصيد الفاتورة لا يكفي لإتمام الاسترجاع.")
      }

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

      const newPaid = Math.max(
        0,
        Number(currentInvoice.paidAmount) - Number(r.amount),
      )
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
          processingStartedAt: null,
          creditNoteId: cn[0].id,
          providerRefundId,
          processedAt: new Date(),
        })
        .where(eq(refundRequest.id, r.id))

      await writeAudit(
        { action: "refund.process", actorUserId: user.id, entityType: "refund_request", entityId: r.id, metadata: { amount: r.amount, providerRefundId } },
        tx,
      )
      return "processed" as const
    })
    activeClaimId = null

    if (finalization === "already_processed") return { ok: true }

    await notify({
      userId: r.requestedByUserId,
      type: "refund.processed",
      title: "تم استرجاع المبلغ",
      body: `تم استرجاع ${r.amount} ${inv.currency}.`,
      caseId: r.caseId,
      href: `/dashboard/cases/${r.caseId}`,
    })
    revalidatePath("/dashboard/finance")
    revalidatePath("/admin/finance")
    revalidatePath(`/dashboard/cases/${r.caseId}`)
    return { ok: true }
  } catch (err) {
    if (activeClaimId) {
      await failRefundClaim(
        activeClaimId,
        err instanceof Error ? err.message : "Refund processing failed",
      )
    }
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

async function failRefundClaim(refundRequestId: string, reason: string): Promise<void> {
  await db
    .update(refundRequest)
    .set({ status: "FAILED", processingStartedAt: null, failureReason: reason })
    .where(
      and(
        eq(refundRequest.id, refundRequestId),
        eq(refundRequest.status, "PROCESSING"),
      ),
    )
}
