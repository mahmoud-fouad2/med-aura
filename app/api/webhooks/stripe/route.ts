import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  payment,
  appointment,
  appointmentStatusHistory,
  aestheticCase,
  caseStatusHistory,
  paymentWebhookEvent,
} from "@/lib/db/schema"
import { constructWebhookEvent } from "@/lib/payments/stripe"
import { writeAudit } from "@/lib/audit"
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

  // Idempotency: record the event; if it already exists, we've handled it.
  const recorded = await db
    .insert(paymentWebhookEvent)
    .values({
      provider: "stripe",
      eventId: parsed.eventId,
      type: parsed.type,
      payload: parsed.raw as object,
    })
    .onConflictDoNothing()
    .returning({ id: paymentWebhookEvent.id })

  if (recorded.length === 0) {
    // duplicate delivery — already processed
    return NextResponse.json({ received: true, duplicate: true })
  }
  const eventRowId = recorded[0].id

  try {
    if (parsed.kind === "payment_succeeded" && parsed.paymentId) {
      await applyPaymentSucceeded(parsed.paymentId, parsed.providerIntentId)
    } else if (parsed.kind === "payment_failed" && parsed.paymentId) {
      await db
        .update(payment)
        .set({ status: "FAILED", failureReason: parsed.reason ?? "unknown" })
        .where(eq(payment.id, parsed.paymentId))
      await writeAudit({
        action: "payment.failed",
        entityType: "payment",
        entityId: parsed.paymentId,
        metadata: { reason: parsed.reason },
      })
    }

    await db
      .update(paymentWebhookEvent)
      .set({ processedAt: new Date() })
      .where(eq(paymentWebhookEvent.id, eventRowId))

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error("stripe webhook processing failed", {
      eventId: parsed.eventId,
      error: err instanceof Error ? err.message : String(err),
    })
    await db
      .update(paymentWebhookEvent)
      .set({ error: err instanceof Error ? err.message : String(err) })
      .where(eq(paymentWebhookEvent.id, eventRowId))
    // 500 so Stripe retries; the unique constraint keeps retries idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }
}

/** Mark payment PAID and confirm the appointment + advance the case. Idempotent. */
async function applyPaymentSucceeded(
  paymentId: string,
  providerIntentId: string | null,
) {
  await db.transaction(async (tx) => {
    const pay = (
      await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1)
    )[0]
    if (!pay) {
      logger.warn("webhook: payment not found", { paymentId })
      return
    }
    if (pay.status === "PAID") return // already applied

    await tx
      .update(payment)
      .set({
        status: "PAID",
        paidAt: new Date(),
        providerIntentId: providerIntentId ?? pay.providerIntentId,
      })
      .where(eq(payment.id, paymentId))

    await writeAudit(
      {
        action: "payment.paid",
        actorUserId: pay.payerUserId,
        entityType: "payment",
        entityId: paymentId,
        metadata: { amount: pay.amount, currency: pay.currency },
      },
      tx,
    )

    if (pay.appointmentId) {
      const appt = (
        await tx
          .select({ id: appointment.id, status: appointment.status, caseId: appointment.caseId })
          .from(appointment)
          .where(eq(appointment.id, pay.appointmentId))
          .limit(1)
      )[0]
      if (appt && appt.status === "PENDING_PAYMENT") {
        await tx
          .update(appointment)
          .set({ status: "CONFIRMED" })
          .where(eq(appointment.id, appt.id))
        await tx.insert(appointmentStatusHistory).values({
          appointmentId: appt.id,
          fromStatus: "PENDING_PAYMENT",
          toStatus: "CONFIRMED",
          note: "تم الدفع وتأكيد الموعد",
        })
        await writeAudit(
          {
            action: "appointment.confirm",
            actorUserId: pay.payerUserId,
            entityType: "appointment",
            entityId: appt.id,
          },
          tx,
        )

        if (appt.caseId) {
          await tx
            .update(aestheticCase)
            .set({ status: "CONSULTATION_BOOKED" })
            .where(eq(aestheticCase.id, appt.caseId))
          await tx.insert(caseStatusHistory).values({
            caseId: appt.caseId,
            toStatus: "CONSULTATION_BOOKED",
            note: "تم تأكيد حجز الاستشارة",
          })
        }
      }
    }
  })
}
