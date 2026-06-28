import { describe, it, expect, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, doctorProfile, appointment } from "@/lib/db/schema"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

/**
 * Proves the DB-level guarantee: a doctor cannot have two non-cancelled
 * appointments at the same start time (partial unique index). Requires a
 * migrated database (DATABASE_URL); skipped otherwise.
 */
describe.skipIf(!HAS_DB)("no double-booking (DB constraint)", () => {
  const userId = rid()
  const docUserId = rid()
  let doctorId = ""
  const startsAt = new Date("2030-01-01T10:00:00Z")
  const endsAt = new Date("2030-01-01T10:30:00Z")

  afterAll(async () => {
    await db.delete(appointment).where(eq(appointment.doctorId, doctorId))
    if (doctorId) await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    await db.delete(user).where(eq(user.id, userId))
    await db.delete(user).where(eq(user.id, docUserId))
    await pool.end()
  })

  it("rejects a second appointment in the same slot", async () => {
    await db.insert(user).values({ id: userId, name: "Patient", email: `p-${userId}@t.local` })
    await db.insert(user).values({ id: docUserId, name: "Doctor", email: `d-${docUserId}@t.local` })
    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: docUserId,
        name: "Dr Test",
        slug: `dr-${docUserId}`,
        country: "SA",
        status: "approved",
        published: true,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc[0].id

    await db.insert(appointment).values({
      reference: `APT-${rid().slice(0, 8)}`,
      patientUserId: userId,
      doctorId,
      startsAt,
      endsAt,
      status: "PENDING_PAYMENT",
    })

    let code: string | undefined
    try {
      await db.insert(appointment).values({
        reference: `APT-${rid().slice(0, 8)}`,
        patientUserId: userId,
        doctorId,
        startsAt,
        endsAt,
        status: "PENDING_PAYMENT",
      })
    } catch (e) {
      const err = e as { code?: string; cause?: { code?: string } }
      code = err.code ?? err.cause?.code
    }
    // 23505 = Postgres unique_violation
    expect(code).toBe("23505")
  })
})
