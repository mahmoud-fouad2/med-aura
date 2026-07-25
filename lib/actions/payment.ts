"use server"

import { z } from "zod"
import { eq, desc, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  invoice,
  payment,
  appointment,
  appointmentStatusHistory,
  doctorProfile,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, hasRole, PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, forbidden, conflict, validation, notFound } from "@/lib/errors"
import { appUrl } from "@/lib/env"
import { isStripeConfigured, createCheckoutSession } from "@/lib/payments/stripe"
import { decideManualPaymentEligibility } from "@/lib/pdf/manual-payment-eligibility"
import type { ActionResult } from "@/lib/actions/provider"

function ref(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
}

type FinalPaymentResult = { paymentConfigured: boolean; checkoutUrl?: string; amount: string }

/**
 * Patient pays the remaining balance on their invoice. The amount is ALWAYS the
 * server-computed `invoice.remainingAmount` — never a client-supplied value.
 */
export async function createFinalPayment(
  caseId: string,
): Promise<ActionResult<FinalPaymentResult>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PAYMENT_CREATE)

    const c = (
      await db
        .select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId, status: aestheticCase.status })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, caseId))
        .limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (c.patientUserId !== user.id) throw forbidden()

    const inv = (
      await db
        .select()
        .from(invoice)
        .where(eq(invoice.caseId, caseId))
        .orderBy(desc(invoice.createdAt))
        .limit(1)
    )[0]
    if (!inv) throw conflict("لا توجد فاتورة لهذه الحالة بعد.")
    const remaining = Number(inv.remainingAmount)
    if (remaining <= 0) throw conflict("لا يوجد رصيد متبقٍ على هذه الفاتورة.")
    if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status))
      throw conflict("لا يمكن سداد هذه الفاتورة في حالتها الحالية.")

    // one pending final-payment attempt at a time
    const pendingExisting = (
      await db
        .select({ id: payment.id })
        .from(payment)
        .where(eq(payment.caseId, caseId))
        .orderBy(desc(payment.createdAt))
        .limit(1)
    )[0]
    if (pendingExisting) {
      const pRow = (await db.select().from(payment).where(eq(payment.id, pendingExisting.id)).limit(1))[0]
      if (pRow?.purpose === "FINAL_PAYMENT" && ["CREATED", "PENDING"].includes(pRow.status)) {
        throw conflict("توجد محاولة دفع سابقة قيد المعالجة. انتظر قليلًا أو أعد المحاولة لاحقًا.")
      }
    }

    const meta = await requestMeta()
    const amount = remaining.toFixed(2)

    const paymentId = await db.transaction(async (tx) => {
      const pay = await tx
        .insert(payment)
        .values({
          reference: ref("PAY"),
          purpose: "FINAL_PAYMENT",
          status: "CREATED",
          amount,
          currency: inv.currency,
          payerUserId: user.id,
          caseId,
          provider: "stripe",
        })
        .returning({ id: payment.id })
      await writeAudit(
        { action: "invoice.final_payment.create", actorUserId: user.id, entityType: "invoice", entityId: inv.id, metadata: { amount }, ...meta },
        tx,
      )
      return pay[0].id
    })

    if (!isStripeConfigured()) {
      return { ok: true, data: { paymentConfigured: false, amount } }
    }

    const checkout = await createCheckoutSession({
      paymentId,
      amount: remaining,
      currency: inv.currency,
      description: `سداد المتبقي — فاتورة ${inv.invoiceNumber}`,
      customerEmail: user.email,
      successUrl: `${appUrl()}/dashboard/cases/${caseId}?final_payment=1`,
      cancelUrl: `${appUrl()}/dashboard/cases/${caseId}?final_payment_canceled=1`,
    })
    await db.update(payment).set({ status: "PENDING", providerSessionId: checkout.id }).where(eq(payment.id, paymentId))

    return { ok: true, data: { paymentConfigured: true, checkoutUrl: checkout.url, amount } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── Manual / offline payment (Finance / Super Admin only) ──────────────── */

const MANUAL_METHODS = ["bank_transfer", "cash", "pos", "external", "other"] as const

const manualPaymentSchema = z.object({
  appointmentId: z.string().min(1),
  method: z.enum(MANUAL_METHODS),
  referenceNote: z.string().trim().min(1, "أدخل رقم المرجع أو ملاحظة.").max(500),
  paidAt: z.coerce.date(),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().length(3),
  confirmed: z.literal(true, {
    message: "يجب تأكيد أن هذه الدفعة تم التحقق منها خارجيًا.",
  }),
})

type ManualPaymentResult = { paymentId: string }

/**
 * Records a payment that happened outside Stripe (bank transfer, cash,
 * POS, ...) and confirms the appointment exactly like the Stripe webhook
 * does. The only real duplicate-payment guard is the appointment status
 * check — a second call on an already-CONFIRMED appointment is refused.
 * Never gated by ENABLE_TEST_PAYMENT_TOOLS: this is a permanent Finance
 * feature, not a QA tool, and it never touches real Stripe payment rows.
 */
export async function recordManualPayment(
  input: unknown,
): Promise<ActionResult<ManualPaymentResult>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.FINANCE_ACCESS)

    const parsed = manualPaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    }
    const data = parsed.data

    const appt = (
      await db
        .select({
          id: appointment.id,
          status: appointment.status,
          patientUserId: appointment.patientUserId,
          doctorId: appointment.doctorId,
          caseId: appointment.caseId,
          reference: appointment.reference,
        })
        .from(appointment)
        .where(eq(appointment.id, data.appointmentId))
        .limit(1)
    )[0]

    const decision = decideManualPaymentEligibility({
      appointment: appt ? { status: appt.status } : null,
    })
    if (!decision.allowed) {
      throw conflict(
        decision.reason === "not_found"
          ? "الموعد غير موجود."
          : "هذا الموعد مؤكَّد أو مدفوع بالفعل — لا يمكن تسجيل دفعة يدوية مكررة.",
      )
    }
    // decision.allowed guarantees appt is non-null (same guard shape as decideVideoAccess).
    const confirmedAppt = appt!

    const meta = await requestMeta()

    const paymentId = await db.transaction(async (tx) => {
      const pay = await tx
        .insert(payment)
        .values({
          reference: ref("PAY"),
          purpose: "CONSULTATION_FEE",
          status: "PAID",
          amount: data.amount.toFixed(2),
          currency: data.currency,
          payerUserId: confirmedAppt.patientUserId,
          appointmentId: confirmedAppt.id,
          caseId: confirmedAppt.caseId,
          provider: "manual",
          manualMethod: data.method,
          manualReferenceNote: data.referenceNote,
          manualRecordedById: user.id,
          paidAt: data.paidAt,
        })
        .returning({ id: payment.id })

      await tx
        .update(appointment)
        .set({ status: "CONFIRMED" })
        .where(eq(appointment.id, confirmedAppt.id))
      await tx.insert(appointmentStatusHistory).values({
        appointmentId: confirmedAppt.id,
        fromStatus: confirmedAppt.status,
        toStatus: "CONFIRMED",
        changedBy: user.id,
        note: `دفعة يدوية (${data.method}): ${data.referenceNote}`,
      })

      // Settle a case-linked invoice too, mirroring the Stripe webhook's
      // final-payment path, so the case's billing view stays consistent.
      if (confirmedAppt.caseId) {
        const inv = (
          await tx
            .select()
            .from(invoice)
            .where(eq(invoice.caseId, confirmedAppt.caseId))
            .orderBy(desc(invoice.createdAt))
            .limit(1)
        )[0]
        if (inv) {
          const paidAmount = Number(inv.paidAmount) + data.amount
          const remaining = Math.max(Number(inv.total) - paidAmount, 0)
          await tx
            .update(invoice)
            .set({
              paidAmount: paidAmount.toFixed(2),
              remainingAmount: remaining.toFixed(2),
              status: remaining <= 0 ? "PAID" : "PARTIALLY_PAID",
            })
            .where(eq(invoice.id, inv.id))
        }
      }

      await writeAudit(
        {
          action: "payment.manual_recorded",
          actorUserId: user.id,
          entityType: "appointment",
          entityId: confirmedAppt.id,
          metadata: {
            paymentId: pay[0].id,
            method: data.method,
            amount: data.amount,
            currency: data.currency,
          },
          ...meta,
        },
        tx,
      )

      return pay[0].id
    })

    // Notifications are best-effort and happen after the transaction commits.
    await notify({
      userId: confirmedAppt.patientUserId,
      type: "appointment.confirmed",
      title: "تم تأكيد موعدك",
      body: `تم استلام دفعتك وتأكيد موعدك ${confirmedAppt.reference}.`,
      href: "/dashboard/appointments",
    })
    const doctorRow = (
      await db
        .select({ userId: doctorProfile.userId })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, confirmedAppt.doctorId))
        .limit(1)
    )[0]
    if (doctorRow) {
      await notify({
        userId: doctorRow.userId,
        type: "appointment.confirmed",
        title: "تأكّد موعد جديد",
        body: `تأكّد موعد ${confirmedAppt.reference} بعد استلام الدفعة.`,
        href: "/dashboard/appointments",
      })
    }

    revalidatePath("/admin/finance")
    revalidatePath("/admin/consultations")
    revalidatePath("/dashboard/appointments")

    return { ok: true, data: { paymentId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const cancelManualPaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(5, "اذكر سبب الإلغاء.").max(500),
})

/** Super Admin only: reverses a manual payment and reopens the appointment
 *  for payment. Never touches a real Stripe-sourced payment. */
export async function cancelManualPayment(
  input: unknown,
): Promise<ActionResult<{ appointmentId: string | null }>> {
  try {
    const user = await requireUser()
    if (!(await hasRole(user.id, ROLES.SUPER_ADMIN))) throw forbidden()

    const parsed = cancelManualPaymentSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    }
    const data = parsed.data

    const pay = (
      await db.select().from(payment).where(eq(payment.id, data.paymentId)).limit(1)
    )[0]
    if (!pay) throw notFound("الدفعة غير موجودة.")
    if (pay.provider !== "manual") throw conflict("هذا الإجراء مخصص للدفعات اليدوية فقط.")
    if (pay.status !== "PAID") throw conflict("هذه الدفعة ليست في حالة مدفوعة.")

    const meta = await requestMeta()

    await db.transaction(async (tx) => {
      await tx
        .update(payment)
        .set({ status: "CANCELLED", failureReason: `ألغيت يدويًا: ${data.reason}` })
        .where(eq(payment.id, pay.id))

      if (pay.appointmentId) {
        await tx
          .update(appointment)
          .set({ status: "PENDING_PAYMENT" })
          .where(and(eq(appointment.id, pay.appointmentId), eq(appointment.status, "CONFIRMED")))
        await tx.insert(appointmentStatusHistory).values({
          appointmentId: pay.appointmentId,
          fromStatus: "CONFIRMED",
          toStatus: "PENDING_PAYMENT",
          changedBy: user.id,
          note: `إلغاء دفعة يدوية: ${data.reason}`,
        })
      }

      await writeAudit(
        {
          action: "payment.manual_cancelled",
          actorUserId: user.id,
          entityType: "payment",
          entityId: pay.id,
          metadata: { reason: data.reason },
          ...meta,
        },
        tx,
      )
    })

    await notify({
      userId: pay.payerUserId,
      type: "payment.manual_cancelled",
      title: "تم إلغاء تسجيل دفعتك",
      body: "تواصل مع الدعم لمزيد من التفاصيل حول موعدك.",
      href: "/dashboard/appointments",
    })

    revalidatePath("/admin/finance")
    revalidatePath("/admin/consultations")

    return { ok: true, data: { appointmentId: pay.appointmentId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
