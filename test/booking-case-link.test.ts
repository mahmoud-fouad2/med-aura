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
  availabilityRule,
} from "@/lib/db/schema"
import { bookConsultation } from "@/lib/actions/booking"
import { POST } from "@/app/api/webhooks/stripe/route"
import * as stripeModule from "@/lib/payments/stripe"

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

describe.skipIf(!HAS_DB)("Booking case & payment linking", () => {
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
      await db.delete(availabilityRule).where(eq(availabilityRule.doctorId, doctorId))
      await db.delete(doctorProcedure).where(eq(doctorProcedure.doctorId, doctorId))
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    await db.delete(user).where(inArray(user.id, [patientUserId, doctorUserId]))
    await pool.end()
  })

  it("links the auto-created case's id onto the payment row when booking directly", async () => {
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

    await db.insert(doctorProcedure).values({ doctorId, procedureId })

    // Wide-open availability (all 7 days, full day) so the real slot
    // validation in bookConsultation accepts the test's chosen time —
    // this test isn't exercising availability logic, just the case/payment
    // linking that happens once a booking succeeds.
    for (let day = 0; day <= 6; day++) {
      await db.insert(availabilityRule).values({
        doctorId,
        dayOfWeek: day,
        startTime: "00:00",
        endTime: "23:59",
        slotMinutes: 30,
        type: "IN_PERSON_CONSULTATION",
        active: true,
      })
    }

    const sessionMod = await import("@/lib/session")
    vi.mocked(sessionMod.requireUser).mockResolvedValue({
      id: patientUserId,
      email: `bp-${patientUserId}@t.local`,
      name: "Booking Patient",
      role: "patient",
      emailVerified: true,
    } as never)

    vi.spyOn(stripeModule, "isStripeConfigured").mockReturnValue(true)
    vi.spyOn(stripeModule, "createCheckoutSession").mockResolvedValueOnce({
      id: "cs_mock_123",
      url: "https://checkout.stripe.com/mock-123",
    })

    // Must fall within getAvailableSlots' generation window (21 days from
    // now) — a far-future fixed date is correctly rejected as unavailable.
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    startsAt.setUTCMinutes(0, 0, 0)
    const result = await bookConsultation({
      doctorId,
      startsAt: startsAt.toISOString(),
      type: "IN_PERSON_CONSULTATION",
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.data) throw new Error("booking failed")
    expect(result.data.appointmentId).toBeDefined()
    createdApptIds.push(result.data.appointmentId)

    const [appt] = await db.select().from(appointment).where(eq(appointment.id, result.data.appointmentId))
    expect(appt).toBeDefined()
    expect(appt.caseId).toBeTruthy()
    createdCaseIds.push(appt.caseId!)

    const [pay] = await db.select().from(payment).where(eq(payment.appointmentId, result.data.appointmentId))
    expect(pay).toBeDefined()
    createdPaymentIds.push(pay.id)
    // Finding 8: the payment row must carry the same (auto-created) case id
    // as the appointment it's paying for, not a null left over from booking.
    expect(pay.caseId).toBe(appt.caseId)
  }, 15000)

  it("backfills payment.caseId via the Stripe webhook when the payment row previously had none", async () => {
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
        caseId: null, // intentionally null — this is what the webhook must backfill
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

    const [updatedPay] = await db.select().from(payment).where(eq(payment.id, pay.id))
    expect(updatedPay.status).toBe("PAID")
    expect(updatedPay.caseId).toBe(c.id)
  })
})
