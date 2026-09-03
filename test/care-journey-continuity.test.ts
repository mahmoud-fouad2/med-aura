import { describe, it, expect, afterAll, vi } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  doctorProfile,
  appointment,
  aestheticCase,
  caseStatusHistory,
  consent,
  procedure,
  doctorProcedure,
} from "@/lib/db/schema"
import { completeConsultation } from "@/lib/actions/care"
import { requireUser, getCurrentUser } from "@/lib/session"
import { GET as getMobileCases } from "@/app/api/mobile/v1/cases/route"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/session")>()
  return {
    ...mod,
    requireUser: vi.fn(),
    getCurrentUser: vi.fn(),
  }
})

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Care Journey Continuity & Direct Booking Auto-linking", () => {
  const patientId = rid()
  const docUserId = rid()
  let doctorId = ""
  let procedureId = ""
  const createdApptIds: string[] = []
  const createdCaseIds: string[] = []

  afterAll(async () => {
    if (createdApptIds.length > 0) {
      await db.delete(appointment).where(inArray(appointment.id, createdApptIds))
    }
    if (createdCaseIds.length > 0) {
      await db.delete(consent).where(inArray(consent.caseId, createdCaseIds))
      await db.delete(caseStatusHistory).where(inArray(caseStatusHistory.caseId, createdCaseIds))
      await db.delete(aestheticCase).where(inArray(aestheticCase.id, createdCaseIds))
    }
    if (doctorId) {
      await db.delete(doctorProcedure).where(eq(doctorProcedure.doctorId, doctorId))
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    await db.delete(user).where(inArray(user.id, [patientId, docUserId]))
    await pool.end()
  })

  it(
    "gracefully auto-links an aestheticCase when completing an appointment that had no caseId",
    async () => {
    // 1. Setup Patient and Doctor users
    await db.insert(user).values({ id: patientId, name: "Journey Patient", email: `jp-${patientId}@t.local` })
    await db.insert(user).values({ id: docUserId, name: "Dr Journey", email: `dj-${docUserId}@t.local`, role: "doctor" })

    // 2. Setup Procedure & Doctor Profile
    const existingProc = (await db.select({ id: procedure.id }).from(procedure).limit(1))[0]
    procedureId = existingProc?.id ?? ""

    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: docUserId,
        name: "Dr Journey",
        slug: `dr-${docUserId}`,
        country: "SA",
        status: "approved",
        published: true,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    await db.insert(doctorProcedure).values({
      doctorId,
      procedureId,
    })

    // 3. Create a CONFIRMED appointment with NO caseId (legacy/direct booking edge-case)
    const startsAt = new Date("2033-01-01T10:00:00Z")
    const endsAt = new Date("2033-01-01T10:30:00Z")
    const appt = await db
      .insert(appointment)
      .values({
        reference: `APT-${rid().slice(0, 8)}`,
        patientUserId: patientId,
        doctorId,
        startsAt,
        endsAt,
        status: "CONFIRMED",
        caseId: null, // explicitly null
      })
      .returning({ id: appointment.id })
    const apptId = appt[0].id
    createdApptIds.push(apptId)

    // 4. Mock session for Doctor and complete consultation
    vi.mocked(requireUser).mockResolvedValue({
      id: docUserId,
      name: "Dr Journey",
      email: `dj-${docUserId}@t.local`,
      role: "doctor",
      emailVerified: true,
    })

    const res = await completeConsultation(apptId)
    if (!res.ok) console.log("Complete consultation error:", res)
    expect(res.ok).toBe(true)

    // 5. Verify the appointment is now COMPLETED and has a caseId
    const updatedAppt = (
      await db.select().from(appointment).where(eq(appointment.id, apptId)).limit(1)
    )[0]
    expect(updatedAppt.status).toBe("COMPLETED")
    expect(updatedAppt.caseId).not.toBeNull()

    if (updatedAppt.caseId) {
      createdCaseIds.push(updatedAppt.caseId)
      // 6. Verify the auto-created case has CONSULTATION_COMPLETED status and consent granted
      const caseRow = (
        await db.select().from(aestheticCase).where(eq(aestheticCase.id, updatedAppt.caseId)).limit(1)
      )[0]
      expect(caseRow.status).toBe("CONSULTATION_COMPLETED")
      expect(caseRow.patientUserId).toBe(patientId)
      expect(caseRow.doctorId).toBe(doctorId)

      const consentRow = (
        await db.select().from(consent).where(eq(consent.caseId, updatedAppt.caseId)).limit(1)
      )[0]
      expect(consentRow).toBeDefined()
      expect(consentRow.status).toBe("GRANTED")
      expect(consentRow.granteeUserId).toBe(docUserId)
    }
  }, 15000)

  it("returns cases for a patient via GET /api/mobile/v1/cases instead of 403", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: patientId,
      name: "Journey Patient",
      email: `jp-${patientId}@t.local`,
      role: "patient",
      emailVerified: true,
    })

    const res = await getMobileCases()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.role).toBe("patient")
    expect(Array.isArray(body.data.cases)).toBe(true)
    expect(body.data.cases.length).toBeGreaterThanOrEqual(1)
  })

  it("returns cases for a doctor via GET /api/mobile/v1/cases", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: docUserId,
      name: "Dr Journey",
      email: `dj-${docUserId}@t.local`,
      role: "doctor",
      emailVerified: true,
    })

    const res = await getMobileCases()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.role).toBe("doctor")
    expect(Array.isArray(body.data.cases)).toBe(true)
  })
})
