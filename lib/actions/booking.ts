"use server"

import { and, count, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  doctorProfile,
  appointment,
  appointmentStatusHistory,
  payment,
  promoCodeRedemption,
  aestheticCase,
  caseStatusHistory,
  consent,
  doctorProcedure,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { getAvailableSlots, PAYMENT_HOLD_MS } from "@/lib/data/availability"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation, conflict, notConfigured, forbidden } from "@/lib/errors"
import { appUrl, isEmailConfigured } from "@/lib/env"
import { isStripeConfigured, createCheckoutSession } from "@/lib/payments/stripe"
import { resolvePromoCode } from "@/lib/promo"
import type { ActionResult } from "@/lib/actions/provider"
import { trackAnalyticsEvent } from "@/lib/analytics"

function ref(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
}

type BookResult = {
  appointmentId: string
  paymentConfigured: boolean
  checkoutUrl?: string
  /** Present only when a promo code was applied — the list price stays on
   *  the appointment/payment rows as the discounted total actually charged;
   *  this is purely so the confirmation screen can show "X off" honestly. */
  discountApplied?: { amount: string; currency: string }
}

export async function bookConsultation(input: {
  doctorId: string
  startsAt: string // ISO
  caseId?: string
  type?: "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
  promoCode?: string
  /** "mobile" sends Stripe to the app's own custom-scheme redirect
   *  (medaura://) instead of a web dashboard URL, so the in-app browser
   *  (WebBrowser.openAuthSessionAsync) can detect the return and close
   *  itself — the same mechanism already used for Google OAuth. */
  platform?: "web" | "mobile"
}): Promise<ActionResult<BookResult>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.APPOINTMENT_BOOK)
    if (isEmailConfigured() && process.env.NODE_ENV === "production" && !user.emailVerified) {
      throw forbidden("يرجى تأكيد بريدك الإلكتروني أولًا للمتابعة مع تأكيد الحجز.")
    }
    if (!isStripeConfigured()) {
      throw notConfigured("بوابة الدفع غير مفعّلة حاليًا، ولم يتم حجز الموعد.")
    }

    const type = input.type ?? "VIDEO_CONSULTATION"

    const doc = (
      await db
        .select({
          id: doctorProfile.id,
          userId: doctorProfile.userId,
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

    const listAmount = Number(doc.fee)
    const currency = doc.currency
    const apptRef = ref("APT")
    const payRef = ref("PAY")
    const paymentExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MS)

    let appointmentId: string
    let paymentId: string
    let amount = listAmount
    let discountApplied: BookResult["discountApplied"]
    try {
      const result = await db.transaction(async (tx) => {
        const promo = input.promoCode
          ? await resolvePromoCode(tx, { code: input.promoCode, userId: user.id, amount: listAmount, currency })
          : null
        const chargedAmount = promo ? Number(promo.finalAmount) : listAmount

        // Cap concurrent unpaid bookings per patient to prevent slot starvation / reservation denial of service
        const MAX_PENDING_APPOINTMENTS_PER_PATIENT = 3
        const [pendingCount] = await tx
          .select({ count: count() })
          .from(appointment)
          .where(
            and(
              eq(appointment.patientUserId, user.id),
              eq(appointment.status, "PENDING_PAYMENT"),
              gt(appointment.paymentExpiresAt, new Date()),
            ),
          )
        if ((pendingCount?.count ?? 0) >= MAX_PENDING_APPOINTMENTS_PER_PATIENT) {
          throw conflict("لديك مواعيد قيد انتظار الدفع بالفعل. أكمل دفعها أو انتظر حتى انتهاء مهلتها قبل حجز موعد جديد.")
        }

        let resolvedCaseId = input.caseId ?? null
        if (!resolvedCaseId) {
          // Only the doctor's own assigned procedure — never an arbitrary
          // catalog fallback, which would tag the case with a procedure the
          // doctor doesn't even offer.
          const docProc = (
            await tx
              .select({ procedureId: doctorProcedure.procedureId })
              .from(doctorProcedure)
              .where(eq(doctorProcedure.doctorId, doc.id))
              .limit(1)
          )[0]
          const procId = docProc?.procedureId
          if (procId) {
            const caseRef = `CASE-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}`
            const newCase = await tx
              .insert(aestheticCase)
              .values({
                reference: caseRef,
                patientUserId: user.id,
                procedureId: procId,
                doctorId: doc.id,
                centerId: doc.centerId,
                status: "SHARED_WITH_PROVIDER",
                goal: `استشارة مع ${doc.name}`,
                createdBy: user.id,
              })
              .returning({ id: aestheticCase.id })
            resolvedCaseId = newCase[0].id

            await tx.insert(caseStatusHistory).values({
              caseId: resolvedCaseId,
              toStatus: "SHARED_WITH_PROVIDER",
              changedBy: user.id,
              note: "إنشاء تلقائي مع حجز الاستشارة",
            })

            await tx.insert(consent).values({
              caseId: resolvedCaseId,
              patientUserId: user.id,
              granteeUserId: doc.userId,
              purpose: "consultation_review",
              status: "GRANTED",
            })
          }
        }

        const appt = await tx
          .insert(appointment)
          .values({
            reference: apptRef,
            caseId: resolvedCaseId,
            patientUserId: user.id,
            doctorId: doc.id,
            centerId: doc.centerId,
            type,
            status: "PENDING_PAYMENT",
            startsAt: new Date(slot.startsAt),
            endsAt: new Date(slot.endsAt),
            paymentExpiresAt,
            priceAmount: String(chargedAmount),
            currency,
          })
          .returning({ id: appointment.id })
        const aId = appt[0].id

        await tx.insert(appointmentStatusHistory).values({
          appointmentId: aId,
          toStatus: "PENDING_PAYMENT",
          changedBy: user.id,
        })

        if (promo) {
          await tx.insert(promoCodeRedemption).values({
            promoCodeId: promo.promoCodeId,
            userId: user.id,
            appointmentId: aId,
            discountAmount: promo.discountAmount,
            currency,
          })
        }

        const pay = await tx
          .insert(payment)
          .values({
            reference: payRef,
            purpose: "CONSULTATION_FEE",
            status: "CREATED",
            amount: String(chargedAmount),
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
            metadata: { doctorId: doc.id, startsAt: slot.startsAt, promoApplied: Boolean(promo) },
          },
          tx,
        )
        return {
          aId,
          pId: pay[0].id,
          chargedAmount,
          discount: promo ? { amount: promo.discountAmount, currency } : undefined,
        }
      })
      appointmentId = result.aId
      paymentId = result.pId
      amount = result.chargedAmount
      discountApplied = result.discount
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

    let checkout: { id: string; url: string }
    try {
      checkout = await createCheckoutSession({
        paymentId,
        appointmentId,
        amount,
        currency,
        description: `استشارة مع ${doc.name}`,
        customerEmail: user.email,
        successUrl:
          input.platform === "mobile"
            ? `${appUrl()}/api/payments/return?platform=mobile&status=success&appointmentId=${appointmentId}`
            : `${appUrl()}/dashboard/appointments?booked=1`,
        cancelUrl:
          input.platform === "mobile"
            ? `${appUrl()}/api/payments/return?platform=mobile&status=canceled&appointmentId=${appointmentId}`
            : `${appUrl()}/dashboard/appointments?canceled=1`,
        expiresAt: paymentExpiresAt,
      })
    } catch (err) {
      await db.transaction(async (tx) => {
        await tx
          .update(appointment)
          .set({ status: "PAYMENT_EXPIRED", updatedAt: new Date() })
          .where(eq(appointment.id, appointmentId))
        await tx
          .update(payment)
          .set({ status: "FAILED", failureReason: "Checkout session creation failed" })
          .where(eq(payment.id, paymentId))
        await tx.insert(appointmentStatusHistory).values({
          appointmentId,
          fromStatus: "PENDING_PAYMENT",
          toStatus: "PAYMENT_EXPIRED",
          note: "تعذّر بدء جلسة الدفع وتم تحرير الموعد",
        })
        await writeAudit(
          {
            action: "appointment.payment_setup_failed",
            actorUserId: user.id,
            entityType: "appointment",
            entityId: appointmentId,
          },
          tx,
        )
      })
      throw err
    }

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

    await trackAnalyticsEvent({
      name: "booking_created",
      userId: user.id,
      locale: user.locale === "en" ? "en" : "ar",
      properties: { doctorId: doc.id, type },
    })

    return {
      ok: true,
      data: { appointmentId, paymentConfigured: true, checkoutUrl: checkout.url, discountApplied },
    }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
