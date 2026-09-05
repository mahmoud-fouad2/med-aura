import { describe, it, expect, afterAll, vi, beforeEach } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  doctorProfile,
  aestheticCase,
  procedure,
  quote,
  payment,
  auditLog,
} from "@/lib/db/schema"
import { createDepositPayment } from "@/lib/actions/payment"
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

describe.skipIf(!HAS_DB)("Deposit Payment Creation & Retries", () => {
  const patientUserId = rid()
  const bystanderUserId = rid()
  const doctorUserId = rid()
  let doctorId = ""
  let procedureId = ""
  const createdCaseIds: string[] = []
  const createdQuoteIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (createdCaseIds.length > 0) {
      await db.delete(payment).where(inArray(payment.caseId, createdCaseIds))
      await db.delete(quote).where(inArray(quote.caseId, createdCaseIds))
      await db.delete(aestheticCase).where(inArray(aestheticCase.id, createdCaseIds))
    }
    if (doctorId) {
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    await db.delete(user).where(inArray(user.id, [patientUserId, bystanderUserId, doctorUserId]))
    await pool.end()
  })

  it("supersedes previous stale deposit attempts and allows retry for accepted quote", async () => {
    // 1. Setup users, doctor, procedure
    await db.insert(user).values({ id: patientUserId, name: "Deposit Patient", email: `dp-${patientUserId}@t.local` })
    await db.insert(user).values({ id: bystanderUserId, name: "Deposit Bystander", email: `db-${bystanderUserId}@t.local` })
    await db.insert(user).values({ id: doctorUserId, name: "Dr Deposit", email: `dd-${doctorUserId}@t.local`, role: "doctor" })

    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: doctorUserId,
        name: "Dr Deposit",
        slug: `dr-dep-${doctorUserId.slice(0, 8)}`,
        country: "SA",
        status: "approved",
        published: true,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    const proc = (await db.select({ id: procedure.id }).from(procedure).limit(1))[0]
    procedureId = proc?.id ?? ""

    // 2. Setup case in QUOTE_ACCEPTED status
    const c = await db
      .insert(aestheticCase)
      .values({
        reference: `CASE-${rid().slice(0, 6).toUpperCase()}`,
        patientUserId,
        doctorId,
        procedureId,
        status: "QUOTE_ACCEPTED",
      })
      .returning({ id: aestheticCase.id })
    const caseId = c[0].id
    createdCaseIds.push(caseId)

    // 3. Setup accepted quote with deposit required
    const q = await db
      .insert(quote)
      .values({
        quoteNumber: `QT-${rid().slice(0, 8).toUpperCase()}`,
        caseId,
        patientUserId,
        doctorId,
        currency: "SAR",
        subtotal: "5000.00",
        discount: "0.00",
        tax: "750.00",
        total: "5750.00",
        depositRequired: "1000.00",
        remainingBalance: "4750.00",
        status: "ACCEPTED",
        createdBy: doctorUserId,
      })
      .returning({ id: quote.id })
    createdQuoteIds.push(q[0].id)

    // 4. Create an initial stale PENDING payment attempt (e.g. user abandoned checkout)
    const initialPay = await db
      .insert(payment)
      .values({
        reference: `PAY-${rid().slice(0, 8).toUpperCase()}`,
        purpose: "DEPOSIT",
        status: "PENDING",
        amount: "1000.00",
        currency: "SAR",
        payerUserId: patientUserId,
        caseId,
        provider: "stripe",
      })
      .returning({ id: payment.id })

    // 5. Bystander cannot initiate deposit
    vi.mocked(requireUser).mockResolvedValueOnce({ id: bystanderUserId, email: "by@t.local" } as any)
    const bystanderRes = await createDepositPayment(caseId)
    expect(bystanderRes.ok).toBe(false)
    if (!bystanderRes.ok) expect(bystanderRes.code).toBe("FORBIDDEN")

    // 6. Patient initiates deposit payment retry
    vi.mocked(requireUser).mockResolvedValueOnce({ id: patientUserId, email: "patient@t.local" } as any)
    const depositRes = await createDepositPayment(caseId)
    expect(depositRes.ok).toBe(true)

    // 7. Verify stale initial payment was CANCELLED with supersede reason
    const stalePay = (
      await db.select().from(payment).where(eq(payment.id, initialPay[0].id)).limit(1)
    )[0]
    expect(stalePay.status).toBe("CANCELLED")
    expect(stalePay.failureReason).toContain("Superseded")

    // 8. Verify new payment attempt exists
    const newPayments = await db
      .select()
      .from(payment)
      .where(eq(payment.caseId, caseId))
    expect(newPayments.length).toBe(2)
  }, 25_000)

  it("rejects deposit payment if case is in an invalid status", async () => {
    const invalidCase = await db
      .insert(aestheticCase)
      .values({
        reference: `CASE-${rid().slice(0, 6).toUpperCase()}`,
        patientUserId,
        doctorId,
        procedureId,
        status: "CONSULTATION_BOOKED",
      })
      .returning({ id: aestheticCase.id })
    createdCaseIds.push(invalidCase[0].id)

    vi.mocked(requireUser).mockResolvedValueOnce({ id: patientUserId, email: "patient@t.local" } as any)
    const res = await createDepositPayment(invalidCase[0].id)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe("CONFLICT")
  }, 25_000)
})
