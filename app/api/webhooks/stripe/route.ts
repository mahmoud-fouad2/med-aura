import { NextResponse } from "next/server"
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  payment,
  appointment,
  appointmentStatusHistory,
  aestheticCase,
  caseStatusHistory,
  paymentWebhookEvent,
  procedureBooking,
  procedureBookingHistory,
  quote,
  invoice,
  userRole,
  role,
} from "@/lib/db/schema"
import { ROLES } from "@/lib/rbac"
import { canTransition, type CaseStatus } from "@/lib/domain/case-state-machine"
import { constructWebhookEvent } from "@/lib/payments/stripe"
import { writeAudit } from "@/lib/audit"
import { notify, type NotifyInput } from "@/lib/notifications"
import { logger } from "@/lib/logger"
import { AppError } from "@/lib/errors"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")
  if (!signature)
    return NextResponse.json({ error: "missing signature" }, { status: 400 })

  const rawBody = await req.text()

  let parsed
  try {
    parsed = constructWebhookEvent(rawBody, signature)
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_CONFIGURED") {
      return NextResponse.json({ error: "not configured" }, { status: 503 })
    }
    logger.warn("stripe webhook signature verification failed")
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  // Persist the provider event once, then claim any still-unprocessed delivery.
  // A row's existence alone never means success: Stripe must be able to retry a
  // row whose previous processing attempt failed.
  await db
    .insert(paymentWebhookEvent)
    .values({
      provider: "stripe",
      eventId: parsed.eventId,
      type: parsed.type,
      payload: parsed.raw as object,
    })
    .onConflictDoNothing()

  const now = new Date()
  const staleClaim = new Date(now.getTime() - 5 * 60_000)
  const claimed = await db
    .update(paymentWebhookEvent)
    .set({
      processingAt: now,
      error: null,
      attemptCount: sql`${paymentWebhookEvent.attemptCount} + 1`,
    })
    .where(
      and(
        eq(paymentWebhookEvent.provider, "stripe"),
        eq(paymentWebhookEvent.eventId, parsed.eventId),
        isNull(paymentWebhookEvent.processedAt),
        or(
          isNull(paymentWebhookEvent.processingAt),
          lt(paymentWebhookEvent.processingAt, staleClaim),
        ),
      ),
    )
    .returning({ id: paymentWebhookEvent.id })

  if (claimed.length === 0) {
    const existing = (
      await db
        .select({ processedAt: paymentWebhookEvent.processedAt })
        .from(paymentWebhookEvent)
        .where(
          and(
            eq(paymentWebhookEvent.provider, "stripe"),
            eq(paymentWebhookEvent.eventId, parsed.eventId),
          ),
        )
        .limit(1)
    )[0]
    if (existing?.processedAt) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Another worker currently owns the event. Do not acknowledge an event
    // that has not completed; a later provider retry can reclaim a stale lease.
    return NextResponse.json({ error: "processing in progress" }, { status: 409 })
  }
  const eventRowId = claimed[0].id

  try {
    if (parsed.kind === "payment_succeeded") {
      if (!parsed.paymentId) {
        throw new Error("Paid Stripe session is missing the internal payment id")
      }
      await applyPaymentSucceeded(parsed.paymentId, parsed.providerIntentId)
    } else if (parsed.kind === "payment_failed" && parsed.paymentId) {
      await applyPaymentFailed(parsed.paymentId, parsed.reason)
    } else if (parsed.kind === "dispute_opened") {
      await applyDisputeOpened(parsed.providerIntentId, parsed.reason, parsed.amount, parsed.currency)
    } else if (parsed.kind === "dispute_closed") {
      await applyDisputeClosed(parsed.providerIntentId, parsed.outcome)
    }

    await db
      .update(paymentWebhookEvent)
      .set({ processedAt: new Date(), processingAt: null, error: null })
      .where(eq(paymentWebhookEvent.id, eventRowId))

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error("stripe webhook processing failed", {
      eventId: parsed.eventId,
      error: err instanceof Error ? err.message : String(err),
    })
    await db
      .update(paymentWebhookEvent)
      .set({
        processingAt: null,
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(paymentWebhookEvent.id, eventRowId))
    // The row remains unprocessed and claimable, so Stripe's retry is useful.
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }
}

/**
 * A customer disputed a charge (chargeback). Stripe has already pulled or
 * held the funds, so the payment must stop reading as cleanly PAID — finance
 * needs it surfaced in the disputes queue with time to submit evidence.
 * Resolved via providerIntentId, which carries a unique index.
 */
async function applyDisputeOpened(
  providerIntentId: string | null,
  reason: string | null,
  amount: number | null,
  currency: string | null,
) {
  if (!providerIntentId) {
    logger.warn("webhook: dispute without payment_intent")
    return
  }
  const pay = (
    await db
      .select({ id: payment.id, status: payment.status, payerUserId: payment.payerUserId })
      .from(payment)
      .where(eq(payment.providerIntentId, providerIntentId))
      .limit(1)
  )[0]
  if (!pay) {
    logger.warn("webhook: dispute for unknown payment", { providerIntentId })
    return
  }
  if (pay.status === "DISPUTED") return // idempotent

  await db.update(payment).set({ status: "DISPUTED" }).where(eq(payment.id, pay.id))
  await writeAudit({
    action: "payment.disputed",
    entityType: "payment",
    entityId: pay.id,
    metadata: { reason, amount, currency, providerIntentId },
  })
  await notifyFinanceStaff({
    type: "payment.disputed",
    title: "نزاع جديد على دفعة",
    body: "استلمنا إشعارًا بنزاع (chargeback) على إحدى الدفعات. راجع لوحة المالية للرد قبل انتهاء المهلة.",
    href: "/admin/finance",
  })
}

/**
 * The dispute closed. "won" means the funds came back, so the payment
 * returns to PAID. Any other outcome (lost / warning_closed) is left as
 * DISPUTED on purpose — deciding whether a lost chargeback should become
 * REFUNDED is a finance policy call, not something a webhook should assume.
 */
async function applyDisputeClosed(providerIntentId: string | null, outcome: string) {
  if (!providerIntentId) return
  const pay = (
    await db
      .select({ id: payment.id, status: payment.status })
      .from(payment)
      .where(eq(payment.providerIntentId, providerIntentId))
      .limit(1)
  )[0]
  if (!pay) {
    logger.warn("webhook: dispute close for unknown payment", { providerIntentId })
    return
  }

  if (outcome === "won" && pay.status === "DISPUTED") {
    await db.update(payment).set({ status: "PAID" }).where(eq(payment.id, pay.id))
  }
  await writeAudit({
    action: "payment.dispute_closed",
    entityType: "payment",
    entityId: pay.id,
    metadata: { outcome, providerIntentId },
  })
  await notifyFinanceStaff({
    type: "payment.dispute_closed",
    title: outcome === "won" ? "تم كسب النزاع على الدفعة" : "أُغلق النزاع على الدفعة",
    body:
      outcome === "won"
        ? "عادت الأموال وتمت إعادة الدفعة إلى حالة مدفوعة."
        : "أُغلق النزاع دون استرداد. راجع لوحة المالية لتحديد الإجراء المناسب.",
    href: "/admin/finance",
  })
}

/** Fan a finance-relevant alert out to every finance admin / super admin. */
async function notifyFinanceStaff(n: { type: string; title: string; body: string; href: string }) {
  const staff = await db
    .select({ userId: userRole.userId, roleKey: role.key })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
  const recipients = [
    ...new Set(
      staff
        .filter((s) => s.roleKey === ROLES.FINANCE_ADMIN || s.roleKey === ROLES.SUPER_ADMIN)
        .map((s) => s.userId),
    ),
  ]
  await Promise.all(recipients.map((userId) => notify({ userId, ...n })))
}

/** Mark payment PAID and confirm the appointment + advance the case. Idempotent. */
async function applyPaymentSucceeded(
  paymentId: string,
  providerIntentId: string | null,
) {
  const post: NotifyInput[] = []

  await db.transaction(async (tx) => {
    const pay = (
      await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1)
    )[0]
    if (!pay) throw new Error(`Payment not found for verified webhook: ${paymentId}`)
    if (pay.status === "PAID") return // already applied — idempotent
    if (["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"].includes(pay.status)) {
      await markPaymentForReconciliation(
        tx,
        paymentId,
        `Late success event received while payment was ${pay.status}`,
      )
      return
    }

    await tx
      .update(payment)
      .set({
        status: "PAID",
        paidAt: new Date(),
        providerIntentId: providerIntentId ?? pay.providerIntentId,
        failureReason: null,
      })
      .where(eq(payment.id, paymentId))

    await writeAudit(
      {
        action: "payment.paid",
        actorUserId: pay.payerUserId,
        entityType: "payment",
        entityId: paymentId,
        metadata: { amount: pay.amount, currency: pay.currency, purpose: pay.purpose },
      },
      tx,
    )

    // ── Consultation fee → confirm appointment + case CONSULTATION_BOOKED ──
    if (pay.appointmentId) {
      const appt = (
        await tx
          .select({ id: appointment.id, status: appointment.status, caseId: appointment.caseId })
          .from(appointment)
          .where(eq(appointment.id, pay.appointmentId))
          .limit(1)
      )[0]
      if (appt && appt.status === "PENDING_PAYMENT") {
        await tx.update(appointment).set({ status: "CONFIRMED" }).where(eq(appointment.id, appt.id))
        await tx.insert(appointmentStatusHistory).values({
          appointmentId: appt.id,
          fromStatus: "PENDING_PAYMENT",
          toStatus: "CONFIRMED",
          note: "تم الدفع وتأكيد الموعد",
        })
        await writeAudit(
          { action: "appointment.confirm", actorUserId: pay.payerUserId, entityType: "appointment", entityId: appt.id },
          tx,
        )
        if (appt.caseId) {
          const caseRow = (
            await tx
              .select({ status: aestheticCase.status })
              .from(aestheticCase)
              .where(eq(aestheticCase.id, appt.caseId))
              .limit(1)
          )[0]
          if (
            caseRow &&
            canTransition(caseRow.status as CaseStatus, "CONSULTATION_BOOKED")
          ) {
            await tx
              .update(aestheticCase)
              .set({ status: "CONSULTATION_BOOKED" })
              .where(eq(aestheticCase.id, appt.caseId))
            await tx.insert(caseStatusHistory).values({
              caseId: appt.caseId,
              fromStatus: caseRow.status,
              toStatus: "CONSULTATION_BOOKED",
              note: "تم تأكيد حجز الاستشارة",
            })
          } else {
            await markPaymentForReconciliation(
              tx,
              paymentId,
              `Consultation paid while case was ${caseRow?.status ?? "missing"}`,
            )
          }
        }
        post.push({
          userId: pay.payerUserId,
          type: "appointment.confirmed",
          title: "تم تأكيد موعد استشارتك",
          caseId: appt.caseId ?? undefined,
          href: appt.caseId ? `/dashboard/cases/${appt.caseId}` : "/dashboard/appointments",
        })
      } else {
        await markPaymentForReconciliation(
          tx,
          paymentId,
          `Consultation paid while appointment was ${appt?.status ?? "missing"}`,
        )
      }
      return
    }

    // ── Deposit → case DEPOSIT_PAID + create procedure booking ──
    if (pay.purpose === "DEPOSIT" && pay.caseId) {
      const caseRow = (
        await tx
          .select({
            id: aestheticCase.id,
            status: aestheticCase.status,
            doctorId: aestheticCase.doctorId,
            centerId: aestheticCase.centerId,
            procedureId: aestheticCase.procedureId,
            patientUserId: aestheticCase.patientUserId,
          })
          .from(aestheticCase)
          .where(eq(aestheticCase.id, pay.caseId))
          .limit(1)
      )[0]
      if (!caseRow || caseRow.status !== "QUOTE_ACCEPTED") {
        await markPaymentForReconciliation(
          tx,
          paymentId,
          `Deposit paid while case was ${caseRow?.status ?? "missing"}`,
        )
        return
      }

      await tx
        .update(aestheticCase)
        .set({ status: "DEPOSIT_PAID" })
        .where(eq(aestheticCase.id, caseRow.id))
      await tx.insert(caseStatusHistory).values({
        caseId: caseRow.id,
        fromStatus: "QUOTE_ACCEPTED",
        toStatus: "DEPOSIT_PAID",
        note: "تم دفع العربون",
      })

      if (caseRow.doctorId) {
        const existing = (
          await tx
            .select({ id: procedureBooking.id })
            .from(procedureBooking)
            .where(eq(procedureBooking.caseId, caseRow.id))
            .limit(1)
        )[0]
        if (!existing) {
          const acceptedQuote = (
            await tx
              .select({ id: quote.id })
              .from(quote)
              .where(eq(quote.caseId, caseRow.id))
              .orderBy(desc(quote.createdAt))
              .limit(1)
          )[0]
          const booking = await tx
            .insert(procedureBooking)
            .values({
              caseId: caseRow.id,
              patientUserId: caseRow.patientUserId,
              doctorId: caseRow.doctorId,
              centerId: caseRow.centerId,
              procedureId: caseRow.procedureId,
              quoteId: acceptedQuote?.id,
              depositPaymentId: paymentId,
              status: "PENDING_MEDICAL_APPROVAL",
            })
            .returning({ id: procedureBooking.id })
          await tx.insert(procedureBookingHistory).values({
            procedureBookingId: booking[0].id,
            toStatus: "PENDING_MEDICAL_APPROVAL",
            note: "تم إنشاء حجز الإجراء بعد دفع العربون",
          })
        }
      }

      await writeAudit(
        { action: "case.deposit_paid", actorUserId: pay.payerUserId, entityType: "aesthetic_case", entityId: caseRow.id },
        tx,
      )
      post.push({
        userId: caseRow.patientUserId,
        type: "deposit.paid",
        title: "تم استلام العربون",
        body: "تم استلام العربون. الخطوة التالية هي الاعتماد الطبي من طبيبك.",
        caseId: caseRow.id,
        href: `/dashboard/cases/${caseRow.id}`,
      })
      return
    }

    // ── Final/remaining balance → invoice PAID + case FULLY_PAID ──
    if (pay.purpose === "FINAL_PAYMENT" && pay.caseId) {
      const inv = (
        await tx.select().from(invoice).where(eq(invoice.caseId, pay.caseId)).orderBy(desc(invoice.createdAt)).limit(1)
      )[0]
      if (!inv) {
        await markPaymentForReconciliation(
          tx,
          paymentId,
          "Final payment received without an invoice",
        )
        return
      }
      const newPaid = Number(inv.paidAmount) + Number(pay.amount)
      const newRemaining = Math.max(0, Number(inv.total) - newPaid)
      const newStatus = newRemaining <= 0 ? "PAID" : "PARTIALLY_PAID"
      await tx
        .update(invoice)
        .set({ paidAmount: newPaid.toFixed(2), remainingAmount: newRemaining.toFixed(2), status: newStatus })
        .where(eq(invoice.id, inv.id))
      await writeAudit(
        { action: "invoice.final_payment.applied", actorUserId: pay.payerUserId, entityType: "invoice", entityId: inv.id, metadata: { amount: pay.amount, newStatus } },
        tx,
      )

      if (newRemaining <= 0) {
        const caseRow = (
          await tx.select({ id: aestheticCase.id, status: aestheticCase.status, patientUserId: aestheticCase.patientUserId }).from(aestheticCase).where(eq(aestheticCase.id, pay.caseId)).limit(1)
        )[0]
        if (
          caseRow &&
          canTransition(caseRow.status as CaseStatus, "FULLY_PAID")
        ) {
          await tx.update(aestheticCase).set({ status: "FULLY_PAID" }).where(eq(aestheticCase.id, pay.caseId))
          await tx.insert(caseStatusHistory).values({ caseId: pay.caseId, fromStatus: caseRow.status, toStatus: "FULLY_PAID", note: "تم سداد كامل المبلغ المتبقي" })
        } else {
          await markPaymentForReconciliation(
            tx,
            paymentId,
            `Final payment completed while case was ${caseRow?.status ?? "missing"}`,
          )
        }
      }

      post.push({
        userId: pay.payerUserId,
        type: "invoice.final_payment.paid",
        title: newRemaining <= 0 ? "تم سداد فاتورتك بالكامل" : "تم استلام دفعة من الرصيد المتبقي",
        caseId: pay.caseId,
        href: `/dashboard/cases/${pay.caseId}`,
      })
    }
  })

  for (const n of post) await notify(n)
}

async function applyPaymentFailed(
  paymentId: string,
  reason: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const pay = (
      await tx
        .select({ status: payment.status })
        .from(payment)
        .where(eq(payment.id, paymentId))
        .limit(1)
    )[0]
    if (!pay) throw new Error(`Payment not found for verified webhook: ${paymentId}`)

    if (["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"].includes(pay.status)) {
      await markPaymentForReconciliation(
        tx,
        paymentId,
        `Late failure event received while payment was ${pay.status}`,
      )
      return
    }

    await tx
      .update(payment)
      .set({ status: "FAILED", failureReason: reason ?? "unknown" })
      .where(eq(payment.id, paymentId))
    await writeAudit(
      {
        action: "payment.failed",
        entityType: "payment",
        entityId: paymentId,
        metadata: { reason },
      },
      tx,
    )
  })
}

type PaymentTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function markPaymentForReconciliation(
  tx: PaymentTx,
  paymentId: string,
  reason: string,
): Promise<void> {
  await tx
    .update(payment)
    .set({ needsReconciliation: true, reconciliationReason: reason })
    .where(eq(payment.id, paymentId))
  await writeAudit(
    {
      action: "payment.reconciliation_required",
      entityType: "payment",
      entityId: paymentId,
      metadata: { reason },
    },
    tx,
  )
}
