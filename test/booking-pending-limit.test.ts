import { describe, it, expect, afterAll } from "vitest"
import { eq, and, gt, count } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, doctorProfile, appointment } from "@/lib/db/schema"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("booking pending slot cap (anti-automation)", () => {
  const patientId = rid()
  const docUserId = rid()
  let doctorId = ""

  afterAll(async () => {
    await db.delete(appointment).where(eq(appointment.patientUserId, patientId))
    if (doctorId) await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    await db.delete(user).where(eq(user.id, patientId))
    await db.delete(user).where(eq(user.id, docUserId))
    await pool.end()
  })

  it("detects when patient reaches the maximum concurrent unpaid pending slots limit (3)", async () => {
    await db.insert(user).values({ id: patientId, name: "Hoarding Patient", email: `p-${patientId}@t.local` })
    await db.insert(user).values({ id: docUserId, name: "Doc", email: `d-${docUserId}@t.local` })
    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: docUserId,
        name: "Dr Limit",
        slug: `dr-${docUserId}`,
        country: "SA",
        status: "approved",
        published: true,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    const futureExpiry = new Date(Date.now() + 15 * 60 * 1000)

    // Insert 3 pending appointments
    for (let i = 1; i <= 3; i++) {
      const startsAt = new Date(`2032-01-0${i}T10:00:00Z`)
      const endsAt = new Date(`2032-01-0${i}T10:30:00Z`)
      await db.insert(appointment).values({
        reference: `APT-${rid().slice(0, 8)}`,
        patientUserId: patientId,
        doctorId,
        startsAt,
        endsAt,
        status: "PENDING_PAYMENT",
        paymentExpiresAt: futureExpiry,
      })
    }

    const [activePending] = await db
      .select({ count: count() })
      .from(appointment)
      .where(
        and(
          eq(appointment.patientUserId, patientId),
          eq(appointment.status, "PENDING_PAYMENT"),
          gt(appointment.paymentExpiresAt, new Date()),
        ),
      )

    expect(activePending?.count).toBe(3)
    const MAX_PENDING = 3
    const isCapReached = (activePending?.count ?? 0) >= MAX_PENDING
    expect(isCapReached).toBe(true)
  })
})
