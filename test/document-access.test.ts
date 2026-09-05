import { describe, it, expect, afterAll, vi, beforeEach } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  doctorProfile,
  procedure,
  doctorProcedure,
  aestheticCase,
  medicalDocument,
  consent,
  documentAccessGrant,
  appointment,
  appointmentStatusHistory,
  payment,
} from "@/lib/db/schema"
import { canViewDocument } from "@/lib/rbac"
import { POST as finalizeUpload } from "@/app/api/uploads/finalize/route"
import { GET as getDocument } from "@/app/api/documents/[id]/route"
import { grantCaseConsent, revokeCaseConsent } from "@/lib/actions/cases"
import { bookConsultation } from "@/lib/actions/booking"
import * as sessionModule from "@/lib/session"
import * as r2Storage from "@/lib/storage/r2"
import * as stripeModule from "@/lib/payments/stripe"
import * as availabilityModule from "@/lib/data/availability"

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

describe.skipIf(!HAS_DB)("Medical Document Access & Post-Consent Upload Grants (Finding 12)", { timeout: 30000 }, () => {
  const patientUserId = rid()
  const doctorAUserId = rid()
  const doctorBUserId = rid()
  let doctorAId = ""
  let doctorBId = ""
  let procedureId = ""

  const createdCaseIds: string[] = []
  const createdDocIds: string[] = []
  const createdApptIds: string[] = []
  const createdPayIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (createdDocIds.length > 0) {
      await db.delete(documentAccessGrant).where(inArray(documentAccessGrant.documentId, createdDocIds))
      await db.delete(medicalDocument).where(inArray(medicalDocument.id, createdDocIds))
    }
    await db.delete(payment).where(eq(payment.payerUserId, patientUserId))
    if (createdApptIds.length > 0) {
      await db.delete(appointmentStatusHistory).where(inArray(appointmentStatusHistory.appointmentId, createdApptIds))
      await db.delete(appointment).where(inArray(appointment.id, createdApptIds))
    }
    if (createdCaseIds.length > 0) {
      await db.delete(consent).where(inArray(consent.caseId, createdCaseIds))
      await db.delete(aestheticCase).where(inArray(aestheticCase.id, createdCaseIds))
    }
    if (doctorAId) {
      await db.delete(doctorProcedure).where(eq(doctorProcedure.doctorId, doctorAId))
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorAId))
    }
    if (doctorBId) {
      await db.delete(doctorProcedure).where(eq(doctorProcedure.doctorId, doctorBId))
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorBId))
    }
    await db.delete(user).where(inArray(user.id, [patientUserId, doctorAUserId, doctorBUserId]))
    await pool.end()
  })

  it("automatically grants access to doctor when patient uploads document after consent is active", async () => {
    // 1. Setup users, doctors, procedure
    await db.insert(user).values({ id: patientUserId, name: "Doc Patient", email: `dp-${patientUserId}@t.local`, role: "patient" })
    await db.insert(user).values({ id: doctorAUserId, name: "Dr Alpha", email: `da-${doctorAUserId}@t.local`, role: "doctor" })
    await db.insert(user).values({ id: doctorBUserId, name: "Dr Beta", email: `db-${doctorBUserId}@t.local`, role: "doctor" })

    const proc = (await db.select({ id: procedure.id }).from(procedure).limit(1))[0]
    expect(proc).toBeDefined()
    procedureId = proc.id

    const [docA] = await db
      .insert(doctorProfile)
      .values({
        userId: doctorAUserId,
        name: "Dr Alpha",
        slug: `dr-alpha-${doctorAUserId.slice(0, 8)}`,
        country: "SA",
        status: "approved",
        published: true,
        consultationFee: "200.00",
        currency: "SAR",
      })
      .returning({ id: doctorProfile.id })
    doctorAId = docA.id

    const [docB] = await db
      .insert(doctorProfile)
      .values({
        userId: doctorBUserId,
        name: "Dr Beta",
        slug: `dr-beta-${doctorBUserId.slice(0, 8)}`,
        country: "SA",
        status: "approved",
        published: true,
        consultationFee: "250.00",
        currency: "SAR",
      })
      .returning({ id: doctorProfile.id })
    doctorBId = docB.id

    await db.insert(doctorProcedure).values([
      { doctorId: doctorAId, procedureId },
      { doctorId: doctorBId, procedureId },
    ])

    // 2. Patient creates a case and shares it with Doctor A
    const [c] = await db
      .insert(aestheticCase)
      .values({
        reference: `CASE-${rid().slice(0, 6).toUpperCase()}`,
        patientUserId,
        procedureId,
        doctorId: doctorAId,
        status: "SUBMITTED",
      })
      .returning({ id: aestheticCase.id })
    createdCaseIds.push(c.id)

    const patientSession = {
      id: patientUserId,
      email: `dp-${patientUserId}@t.local`,
      role: "patient",
    } as any
    vi.mocked(sessionModule.requireUser).mockResolvedValue(patientSession)
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(patientSession)

    const consentRes = await grantCaseConsent(c.id)
    expect(consentRes.ok).toBe(true)

    // 3. Patient uploads a new medical document AFTER consent was granted
    const [docRow] = await db
      .insert(medicalDocument)
      .values({
        caseId: c.id,
        ownerUserId: patientUserId,
        kind: "CASE_PHOTO",
        objectKey: `cases/${c.id}/photo1.jpg`,
        fileName: "photo1.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2048,
        finalized: false,
      })
      .returning({ id: medicalDocument.id })
    createdDocIds.push(docRow.id)

    // Mock R2 inspectObject to simulate successful S3 upload
    vi.spyOn(r2Storage, "inspectObject").mockResolvedValueOnce({
      sizeBytes: 2048,
      contentType: "image/jpeg",
      prefix: Uint8Array.from([0xff, 0xd8, 0xff]),
    })

    const finalizeReq = new Request("http://localhost:3000/api/uploads/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docRow.id }),
    })
    const finalizeRes = await finalizeUpload(finalizeReq)
    expect(finalizeRes.status).toBe(200)

    // 4. Verify in DB that documentAccessGrant was created for Doctor A
    const grants = await db
      .select()
      .from(documentAccessGrant)
      .where(eq(documentAccessGrant.documentId, docRow.id))
    expect(grants.length).toBeGreaterThan(0)
    expect(grants.some((g) => g.granteeUserId === doctorAUserId)).toBe(true)

    // 5. Verify Doctor A can view document via RBAC and GET route
    const canDoctorAView = await canViewDocument(doctorAUserId, docRow.id)
    expect(canDoctorAView).toBe(true)

    const doctorASession = {
      id: doctorAUserId,
      email: `da-${doctorAUserId}@t.local`,
      role: "doctor",
    } as any
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(doctorASession)
    vi.spyOn(r2Storage, "getSignedReadUrl").mockResolvedValueOnce("https://r2.medaura.local/signed/photo1.jpg")

    const getDocReq = new Request(`http://localhost:3000/api/documents/${docRow.id}`)
    const getDocRes = await getDocument(getDocReq, { params: Promise.resolve({ id: docRow.id }) })
    expect(getDocRes.status).toBe(307) // Redirect to signed URL

    // 6. Verify unrelated Doctor B is denied (403)
    const canDoctorBView = await canViewDocument(doctorBUserId, docRow.id)
    expect(canDoctorBView).toBe(false)

    const doctorBSession = {
      id: doctorBUserId,
      email: `db-${doctorBUserId}@t.local`,
      role: "doctor",
    } as any
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(doctorBSession)

    const doctorBReq = new Request(`http://localhost:3000/api/documents/${docRow.id}`)
    const doctorBRes = await getDocument(doctorBReq, { params: Promise.resolve({ id: docRow.id }) })
    expect(doctorBRes.status).toBe(403)

    // 7. Revoke consent -> Doctor A is immediately denied
    vi.mocked(sessionModule.requireUser).mockResolvedValue(patientSession)
    const revokeRes = await revokeCaseConsent(c.id)
    expect(revokeRes.ok).toBe(true)

    const canDoctorAViewAfterRevoke = await canViewDocument(doctorAUserId, docRow.id)
    expect(canDoctorAViewAfterRevoke).toBe(false)

    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(doctorASession)
    const getDocAfterRevokeRes = await getDocument(getDocReq, { params: Promise.resolve({ id: docRow.id }) })
    expect(getDocAfterRevokeRes.status).toBe(403)
  })

  it("auto-grants access to pre-existing documents when booking direct consultation", async () => {
    // 1. Patient has an existing case with an already finalized document
    const [c2] = await db
      .insert(aestheticCase)
      .values({
        reference: `CASE-${rid().slice(0, 6).toUpperCase()}`,
        patientUserId,
        procedureId,
        doctorId: doctorBId,
        status: "SUBMITTED",
      })
      .returning({ id: aestheticCase.id })
    createdCaseIds.push(c2.id)

    const [preDoc] = await db
      .insert(medicalDocument)
      .values({
        caseId: c2.id,
        ownerUserId: patientUserId,
        kind: "MEDICAL_REPORT",
        objectKey: `cases/${c2.id}/report.pdf`,
        fileName: "report.pdf",
        contentType: "application/pdf",
        sizeBytes: 4096,
        finalized: true,
      })
      .returning({ id: medicalDocument.id })
    createdDocIds.push(preDoc.id)

    // Before booking, Doctor B has no access
    expect(await canViewDocument(doctorBUserId, preDoc.id)).toBe(false)

    // 2. Patient books direct consultation with Doctor B for this case
    const patientSession = {
      id: patientUserId,
      email: `dp-${patientUserId}@t.local`,
      role: "patient",
      emailVerified: true,
      phoneVerified: false,
      isTest: false,
      twoFactorEnabled: false,
    } as any
    vi.mocked(sessionModule.requireUser).mockResolvedValue(patientSession)
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(patientSession)

    vi.spyOn(stripeModule, "isStripeConfigured").mockReturnValue(true)
    vi.spyOn(stripeModule, "createCheckoutSession").mockResolvedValueOnce({
      id: "cs_mock_doc",
      url: "https://checkout.stripe.com/mock-doc",
    })

    const startsAt = "2032-07-15T09:00:00.000Z"
    vi.spyOn(availabilityModule, "getAvailableSlots").mockResolvedValueOnce([
      { startsAt, endsAt: "2032-07-15T09:30:00.000Z", label: "test slot" },
    ])

    const bookRes = await bookConsultation({
      doctorId: doctorBId,
      caseId: c2.id,
      startsAt,
      type: "VIDEO_CONSULTATION",
    })
    expect(bookRes.ok).toBe(true)
    if (bookRes.ok && bookRes.data) {
      createdApptIds.push(bookRes.data.appointmentId)
    }

    // 3. Verify Doctor B now automatically has access to the pre-existing document
    const canDoctorBViewPreDoc = await canViewDocument(doctorBUserId, preDoc.id)
    expect(canDoctorBViewPreDoc).toBe(true)

    // Verify GET /api/documents/[id] redirects to signed URL for Doctor B
    const doctorBSession = {
      id: doctorBUserId,
      email: `db-${doctorBUserId}@t.local`,
      role: "doctor",
    } as any
    vi.mocked(sessionModule.getCurrentUser).mockResolvedValue(doctorBSession)
    vi.spyOn(r2Storage, "getSignedReadUrl").mockResolvedValueOnce("https://r2.medaura.local/signed/report.pdf")

    const req = new Request(`http://localhost:3000/api/documents/${preDoc.id}`)
    const res = await getDocument(req, { params: Promise.resolve({ id: preDoc.id }) })
    expect(res.status).toBe(307)
  })
})
