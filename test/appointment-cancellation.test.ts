import { describe, it, expect, afterAll, vi, beforeEach } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  doctorProfile,
  appointment,
  appointmentStatusHistory,
  payment,
} from "@/lib/db/schema"
import { cancelAppointment } from "@/lib/actions/appointments"
import { requireUser } from "@/lib/session"

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

describe.skipIf(!HAS_DB)("Appointment Cancellation Action", () => {
  const patientUserId = rid()
  const doctorUserId = rid()
  const bystanderUserId = rid()
  let doctorId = ""
  const createdApptIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (createdApptIds.length > 0) {
      await db.delete(payment).where(inArray(payment.appointmentId, createdApptIds))
      await db.delete(appointmentStatusHistory).where(inArray(appointmentStatusHistory.appointmentId, createdApptIds))
      await db.delete(appointment).where(inArray(appointment.id, createdApptIds))
    }
    if (doctorId) {
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    await db.delete(user).where(inArray(user.id, [patientUserId, doctorUserId, bystanderUserId]))
    await pool.end()
  })

  it("allows patient to cancel their upcoming confirmed appointment and cancels pending payments", async () => {
    // 1. Setup users and doctor profile
    await db.insert(user).values({ id: patientUserId, name: "Test Patient", email: `tp-${patientUserId}@t.local` })
    await db.insert(user).values({ id: doctorUserId, name: "Dr Cancel", email: `dc-${doctorUserId}@t.local`, role: "doctor" })
    await db.insert(user).values({ id: bystanderUserId, name: "Bystander", email: `by-${bystanderUserId}@t.local` })

    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: doctorUserId,
        name: "Dr Cancel",
        slug: `dr-cancel-${doctorUserId.slice(0, 8)}`,
        country: "SA",
        status: "approved",
        published: true,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    // 2. Insert upcoming confirmed appointment (starts 2 days in the future)
    const futureStartsAt = new Date(Date.now() + 2 * 86400_000)
    const futureEndsAt = new Date(futureStartsAt.getTime() + 30 * 60_000)

    const appt = await db
      .insert(appointment)
      .values({
        reference: `APT-${rid().slice(0, 8).toUpperCase()}`,
        patientUserId,
        doctorId,
        startsAt: futureStartsAt,
        endsAt: futureEndsAt,
        status: "CONFIRMED",
      })
      .returning({ id: appointment.id, reference: appointment.reference })
    createdApptIds.push(appt[0].id)

    // 3. Attach a pending payment
    await db.insert(payment).values({
      reference: `PAY-${rid().slice(0, 8).toUpperCase()}`,
      appointmentId: appt[0].id,
      payerUserId: patientUserId,
      amount: "150.00",
      currency: "SAR",
      purpose: "CONSULTATION_FEE",
      status: "PENDING",
      provider: "stripe",
    })

    // 4. Bystander tries to cancel -> forbidden
    vi.mocked(requireUser).mockResolvedValueOnce({ id: bystanderUserId, email: "bystander@t.local" } as any)
    const bystanderRes = await cancelAppointment({ appointmentId: appt[0].id })
    expect(bystanderRes.ok).toBe(false)
    if (!bystanderRes.ok) expect(bystanderRes.code).toBe("FORBIDDEN")

    // 5. Patient cancels with reason
    vi.mocked(requireUser).mockResolvedValueOnce({ id: patientUserId, email: "patient@t.local" } as any)
    const cancelRes = await cancelAppointment({
      appointmentId: appt[0].id,
      reason: "ظرف عائلي طارئ",
    })
    expect(cancelRes.ok).toBe(true)

    // 6. Verify appointment transitioned to CANCELLED_BY_PATIENT
    const updatedAppt = (
      await db.select().from(appointment).where(eq(appointment.id, appt[0].id)).limit(1)
    )[0]
    expect(updatedAppt.status).toBe("CANCELLED_BY_PATIENT")

    // 7. Verify pending payment was cancelled
    const updatedPayment = (
      await db.select().from(payment).where(eq(payment.appointmentId, appt[0].id)).limit(1)
    )[0]
    expect(updatedPayment.status).toBe("CANCELLED")
    expect(updatedPayment.failureReason).toContain("CANCELLED_BY_PATIENT")

    // 8. Trying to cancel again fails because status is no longer cancellable
    vi.mocked(requireUser).mockResolvedValueOnce({ id: patientUserId, email: "patient@t.local" } as any)
    const repeatRes = await cancelAppointment({ appointmentId: appt[0].id })
    expect(repeatRes.ok).toBe(false)
    if (!repeatRes.ok) expect(repeatRes.code).toBe("CONFLICT")
  }, 25_000)

  it("allows doctor to cancel an upcoming rescheduled appointment", async () => {
    const futureStartsAt = new Date(Date.now() + 3 * 86400_000)
    const futureEndsAt = new Date(futureStartsAt.getTime() + 30 * 60_000)

    const appt = await db
      .insert(appointment)
      .values({
        reference: `APT-${rid().slice(0, 8).toUpperCase()}`,
        patientUserId,
        doctorId,
        startsAt: futureStartsAt,
        endsAt: futureEndsAt,
        status: "RESCHEDULED",
      })
      .returning({ id: appointment.id, reference: appointment.reference })
    createdApptIds.push(appt[0].id)

    // Doctor cancels
    vi.mocked(requireUser).mockResolvedValueOnce({ id: doctorUserId, email: "doctor@t.local" } as any)
    const cancelRes = await cancelAppointment({
      appointmentId: appt[0].id,
      reason: "مؤتمر طبي",
    })
    expect(cancelRes.ok).toBe(true)

    const updatedAppt = (
      await db.select().from(appointment).where(eq(appointment.id, appt[0].id)).limit(1)
    )[0]
    expect(updatedAppt.status).toBe("CANCELLED_BY_PROVIDER")
  }, 25_000)
})
