"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  doctorProfile,
  appointment,
  appointmentStatusHistory,
  payment,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { isSlotAvailable, getAvailableSlots } from "@/lib/data/availability"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation, conflict } from "@/lib/errors"
import { appUrl } from "@/lib/env"
import { isStripeConfigured, createCheckoutSession } from "@/lib/payments/stripe"
import type { ActionResult } from "@/lib/actions/provider"

function ref(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
}

type BookResult = {
  appointmentId: string
  paymentConfigured: boolean
  checkoutUrl?: string
}

export async function bookConsultation(input: {
  doctorId: string
  startsAt: string // ISO
  caseId?: string
  type?: "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
}): Promise<ActionResult<BookResult>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.APPOINTMENT_BOOK)

    const type = input.type ?? "VIDEO_CONSULTATION"

    const doc = (
      await db
        .select({
          id: doctorProfile.id,
          name: doctorProfile.name,
          centerId: doctorProfile.centerId,
          fee: doctorProfile.consultationFee,
          currency: doctorProfile.currency,
          status: doctorProfile.status,
          published: doctorProfile.published,
        })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, input.doctorId))
        .limit(1)
    )[0]
    if (!doc || doc.status !== "approved" || !doc.published)
      throw validation("هذا الطبيب غير متاح للحجز حاليًا.")
    if (!doc.fee || Number(doc.fee) <= 0)
      throw validation("سعر الاستشارة غير محدد لهذا الطبيب بعد.")

    // validate the requested slot against generated availability
    const slots = await getAvailableSlots(doc.id, { type, limit: 500 })
    const slot = slots.find((s) => s.startsAt === input.startsAt)
    if (!slot) throw conflict("هذا الموعد لم يعد متاحًا، اختر موعدًا آخر.")

    const amount = Number(doc.fee)
    const currency = doc.currency
    const apptRef = ref("APT")
    const payRef = ref("PAY")

    let appointmentId: string
    let paymentId: string
    try {
      const result = await db.transaction(async (tx) => {
        const appt = await tx
          .insert(appointment)
          .values({
            reference: apptRef,
            caseId: input.caseId ?? null,
            patientUserId: user.id,
            doctorId: doc.id,
            centerId: doc.centerId,
            type,
            status: "PENDING_PAYMENT",
            startsAt: new Date(slot.startsAt),
            endsAt: new Date(slot.endsAt),
            priceAmount: String(amount),
            currency,
          })
          .returning({ id: appointment.id })
        const aId = appt[0].id

        await tx.insert(appointmentStatusHistory).values({
          appointmentId: aId,
          toStatus: "PENDING_PAYMENT",
          changedBy: user.id,
        })

        const pay = await tx
          .insert(payment)
          .values({
            reference: payRef,
            purpose: "CONSULTATION_FEE",
            status: "CREATED",
            amount: String(amount),
            currency,
            payerUserId: user.id,
            appointmentId: aId,
            caseId: input.caseId ?? null,
            provider: "stripe",
          })
          .returning({ id: payment.id })

        await writeAudit(
          {
            action: "appointment.create",
            actorUserId: user.id,
            entityType: "appointment",
            entityId: aId,
            metadata: { doctorId: doc.id, startsAt: slot.startsAt },
          },
          tx,
        )
        return { aId, pId: pay[0].id }
      })
      appointmentId = result.aId
      paymentId = result.pId
    } catch (err) {
      // Postgres unique_violation from the no-double-booking partial index
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "23505"
      ) {
        throw conflict("هذا الموعد لم يعد متاحًا، اختر موعدًا آخر.")
      }
      throw err
    }

    // Payment step — never fake success.
    if (!isStripeConfigured()) {
      return {
        ok: true,
        data: { appointmentId, paymentConfigured: false },
      }
    }

    const checkout = await createCheckoutSession({
      paymentId,
      appointmentId,
      amount,
      currency,
      description: `استشارة مع ${doc.name}`,
      customerEmail: user.email,
      successUrl: `${appUrl()}/dashboard/appointments?booked=1`,
      cancelUrl: `${appUrl()}/dashboard/appointments?canceled=1`,
    })

    await db
      .update(payment)
      .set({ status: "PENDING", providerSessionId: checkout.id })
      .where(eq(payment.id, paymentId))

    const meta = await requestMeta()
    await writeAudit({
      action: "payment.create",
      actorUserId: user.id,
      entityType: "payment",
      entityId: paymentId,
      metadata: { provider: "stripe", amount, currency },
      ...meta,
    })

    return { ok: true, data: { appointmentId, paymentConfigured: true, checkoutUrl: checkout.url } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
