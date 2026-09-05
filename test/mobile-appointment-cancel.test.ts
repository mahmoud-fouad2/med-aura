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
import { PATCH } from "@/app/api/mobile/v1/appointments/[id]/route"
import * as sessionModule from "@/lib/session"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/session")>()
  return {
    ...mod,
    getCurrentUser: vi.fn(),
    requireUser: vi.fn(),
  }
})

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Mobile Appointment Cancellation (Finding 9)", { timeout: 30000 }, () => {
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

  it("allows patient to cancel their upcoming appointment via mobile PATCH endpoint", async () => {
    // 1. Setup users and doctor
    await db.insert(user).values({ id: patientUserId, name: "Mobile Patient", email: `mp-${patientUserId}@t.local` })
    await db.insert(user).values({ id: doctorUserId, name: "Dr Mobile", email: `dm-${doctorUserId}@t.local`, role: "doctor" })
    await db.insert(user).values({ id: bystanderUserId, name: "Mobile Bystander", email: `mb-${bystanderUserId}@t.local` })

    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: doctorUserId,
        name: "Dr Mobile Cancel",
        slug: `dr-mobile-${doctorUserId.slice(0, 8)}`,
        country: "SA",
        status: "approved",
        published: true,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    // 2. Insert upcoming confirmed appointment
    const futureStartsAt = new Date(Date.now() + 2 * 86400_000)
    const futureEndsAt = new Date(futureStartsAt.getTime() + 30 * 60_000)
    const [appt] = await db
      .insert(appointment)
      .values({
        reference: `APT-${rid().slice(0, 8).toUpperCase()}`,
        patientUserId,
        doctorId,
        startsAt: futureStartsAt,
        endsAt: futureEndsAt,
        status: "CONFIRMED",
      })
      .returning({ id: appointment.id })
    createdApptIds.push(appt.id)

    // 3. Attach pending payment
    await db.insert(payment).values({
      reference: `PAY-${rid().slice(0, 8).toUpperCase()}`,
      appointmentId: appt.id,
      payerUserId: patientUserId,
      amount: "150.00",
      currency: "SAR",
      purpose: "CONSULTATION_FEE",
      status: "PENDING",
      provider: "stripe",
    })

    // 4. Test bystander -> 403 Forbidden
    const mockBystander = {
      id: bystanderUserId,
      email: `mb-${bystanderUserId}@t.local`,
      role: "patient",
    } as any
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValueOnce(mockBystander)
    vi.mocked(sessionModule.requireUser).mockResolvedValueOnce(mockBystander)

    const bystanderReq = new Request(`http://localhost:3000/api/mobile/v1/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: "Unauthorized attempt" }),
    })
    const bystanderRes = await PATCH(bystanderReq, { params: Promise.resolve({ id: appt.id }) })
    expect(bystanderRes.status).toBe(403)

    // 5. Test patient cancellation -> 200 OK
    const mockPatient = {
      id: patientUserId,
      email: `mp-${patientUserId}@t.local`,
      role: "patient",
    } as any
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(mockPatient)
    vi.mocked(sessionModule.requireUser).mockResolvedValue(mockPatient)

    const patientReq = new Request(`http://localhost:3000/api/mobile/v1/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: "ظرف طارئ" }),
    })
    const patientRes = await PATCH(patientReq, { params: Promise.resolve({ id: appt.id }) })
    expect(patientRes.status).toBe(200)
    const json = await patientRes.json()
    expect(json.ok).toBe(true)
    expect(json.data.appointmentId).toBe(appt.id)

    const [updatedAppt] = await db.select().from(appointment).where(eq(appointment.id, appt.id))
    expect(updatedAppt.status).toBe("CANCELLED_BY_PATIENT")

    const histories = await db
      .select()
      .from(appointmentStatusHistory)
      .where(eq(appointmentStatusHistory.appointmentId, appt.id))
    expect(histories.some((h) => h.note === "ظرف طارئ")).toBe(true)

    const [updatedPay] = await db.select().from(payment).where(eq(payment.appointmentId, appt.id))
    expect(updatedPay.status).toBe("CANCELLED")
  })

  it("rejects invalid mobile PATCH actions with 400", async () => {
    const mockPatient = {
      id: patientUserId,
      email: `mp-${patientUserId}@t.local`,
      role: "patient",
    } as any
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(mockPatient)

    const req = new Request(`http://localhost:3000/api/mobile/v1/appointments/${rid()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid_action" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: rid() }) })
    expect(res.status).toBe(400)
  })
})
