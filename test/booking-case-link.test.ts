import { describe, it, expect, afterAll, vi, beforeEach } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  doctorProfile,
  procedure,
  doctorProcedure,
  aestheticCase,
  appointment,
  payment,
  paymentWebhookEvent,
} from "@/lib/db/schema"
import { bookConsultation } from "@/lib/actions/booking"
import { POST } from "@/app/api/webhooks/stripe/route"
import * as stripeModule from "@/lib/payments/stripe"
import * as availabilityModule from "@/lib/data/availability"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/session")>()
  return {
    ...mod,
    requireUser: vi.fn(),
  }
})

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Booking Case & Payment Linking (Finding 8)", { timeout: 30000 }, () => {
  const patientUserId = rid()
  const doctorUserId = rid()
  let doctorId = ""
  let procedureId = ""
  const createdApptIds: string[] = []
  const createdPaymentIds: string[] = []
  const createdCaseIds: string[] = []
  const createdEventIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (createdEventIds.length > 0) {
      await db.delete(paymentWebhookEvent).where(inArray(paymentWebhookEvent.eventId, createdEventIds))
    }
    if (createdPaymentIds.length > 0) {
      await db.delete(payment).where(inArray(payment.id, createdPaymentIds))
    }
    if (createdApptIds.length > 0) {
      await db.delete(appointment).where(inArray(appointment.id, createdApptIds))
    }
    if (createdCaseIds.length > 0) {
      await db.delete(aestheticCase).where(inArray(aestheticCase.id, createdCaseIds))
    }
    if (doctorId) {
      await db.delete(doctorProcedure).where(eq(doctorProcedure.doctorId, doctorId))
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    await db.delete(user).where(inArray(user.id, [patientUserId, doctorUserId]))
    await pool.end()
  })

  it("links resolvedCaseId to payment row when creating direct consultation booking", async () => {
    // 1. Setup patient, doctor, and procedure
    await db.insert(user).values({ id: patientUserId, name: "Booking Patient", email: `bp-${patientUserId}@t.local` })
    await db.insert(user).values({ id: doctorUserId, name: "Booking Doctor", email: `bd-${doctorUserId}@t.local`, role: "doctor" })

    const existingProc = (await db.select({ id: procedure.id }).from(procedure).limit(1))[0]
    expect(existingProc).toBeDefined()
    procedureId = existingProc.id

    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: doctorUserId,
        name: "Dr Link Test",
        slug: `dr-link-${doctorUserId}`,
        country: "SA",
        status: "approved",
        published: true,
        consultationFee: "150.00",
        currency: "SAR",
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    await db.insert(doctorProcedure).values({
      doctorId,
      procedureId,
    })

    const sessionMod = await import("@/lib/session")
    vi.mocked(sessionMod.requireUser).mockResolvedValue({
      id: patientUserId,
      email: `bp-${patientUserId}@t.local`,
      name: "Booking Patient",
      role: "patient",
      emailVerified: true,
      phoneVerified: false,
      isTest: false,
      twoFactorEnabled: false,
    } as any)

    vi.spyOn(stripeModule, "isStripeConfigured").mockReturnValue(true)
    vi.spyOn(stripeModule, "createCheckoutSession").mockResolvedValueOnce({
      id: "cs_mock_123",
      url: "https://checkout.stripe.com/mock-123",
    })

    const startsAt = "2032-05-10T10:00:00.000Z"
    const endsAt = "2032-05-10T10:30:00.000Z"
    vi.spyOn(availabilityModule, "getAvailableSlots").mockResolvedValueOnce([
      {
        startsAt,
        endsAt,
        label: "test slot",
      },
    ])

    const res = await bookConsultation({
      doctorId,
      startsAt,
      type: "IN_PERSON_CONSULTATION",
    })

    expect(res.ok).toBe(true)
    if (!res.ok || !res.data) throw new Error("booking failed")
    const apptId = res.data.appointmentId
    expect(apptId).toBeDefined()
    createdApptIds.push(apptId)

    // Check appointment
    const [appt] = await db.select().from(appointment).where(eq(appointment.id, apptId))
    expect(appt).toBeDefined()
    expect(appt.caseId).toBeTruthy()
    createdCaseIds.push(appt.caseId!)

    // Check payment row: caseId MUST be populated (Finding 8 fix)
    const [pay] = await db.select().from(payment).where(eq(payment.appointmentId, apptId))
    expect(pay).toBeDefined()
    createdPaymentIds.push(pay.id)
    expect(pay.caseId).toBe(appt.caseId)
  })

  it("backfills payment.caseId via Stripe webhook if payment previously had no caseId", async () => {
    // Setup appointment with caseId, and a payment with caseId: null
    const caseRef = `CASE-${rid().slice(0, 6).toUpperCase()}`
    const [c] = await db
      .insert(aestheticCase)
      .values({
        reference: caseRef,
        patientUserId,
        doctorId,
        procedureId,
        status: "UNDER_REVIEW",
      })
      .returning({ id: aestheticCase.id })
    createdCaseIds.push(c.id)

    const apptRef = `APT-${rid().slice(0, 8).toUpperCase()}`
    const [appt] = await db
      .insert(appointment)
      .values({
        reference: apptRef,
        patientUserId,
        doctorId,
        caseId: c.id,
        status: "PENDING_PAYMENT",
        startsAt: new Date("2032-06-01T12:00:00Z"),
        endsAt: new Date("2032-06-01T12:30:00Z"),
        priceAmount: "150.00",
        currency: "SAR",
      })
      .returning({ id: appointment.id })
    createdApptIds.push(appt.id)

    const payRef = `PAY-${rid().slice(0, 8).toUpperCase()}`
    const [pay] = await db
      .insert(payment)
      .values({
        reference: payRef,
        purpose: "CONSULTATION_FEE",
        status: "PENDING",
        amount: "150.00",
        currency: "SAR",
        payerUserId: patientUserId,
        appointmentId: appt.id,
        caseId: null, // Intentionally null to test backfill
        provider: "stripe",
      })
      .returning({ id: payment.id })
    createdPaymentIds.push(pay.id)

    const eventId = `evt_paid_${rid().slice(0, 8)}`
    createdEventIds.push(eventId)

    vi.spyOn(stripeModule, "constructWebhookEvent").mockReturnValueOnce({
      kind: "payment_succeeded",
      eventId,
      type: "checkout.session.completed",
      paymentId: pay.id,
      providerIntentId: `pi_${rid().slice(0, 8)}`,
      providerSessionId: `cs_${rid().slice(0, 8)}`,
      raw: {},
    })

    const req = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify({ id: eventId }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    // Check that webhook backfilled payment.caseId and updated status to PAID
    const [updatedPay] = await db.select().from(payment).where(eq(payment.id, pay.id))
    expect(updatedPay.status).toBe("PAID")
    expect(updatedPay.caseId).toBe(c.id)
  })
})
