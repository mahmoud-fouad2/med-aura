import { describe, it, expect, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, doctorProfile, doctorLicense } from "@/lib/db/schema"
import { searchDoctors } from "@/lib/data/doctors"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

/**
 * Proves the public-visibility rule: only approved + published doctors with a
 * VALID, non-expired license appear in search. Requires DATABASE_URL.
 */
describe.skipIf(!HAS_DB)("search visibility rules", () => {
  const created: { users: string[]; doctors: string[] } = { users: [], doctors: [] }

  async function makeDoctor(opts: {
    status: "approved" | "pending"
    published: boolean
    license?: { status: "VALID" | "EXPIRED"; expiry: string }
  }): Promise<string> {
    const uid = rid()
    created.users.push(uid)
    await db.insert(user).values({ id: uid, name: "D", email: `d-${uid}@t.local` })
    const doc = await db
      .insert(doctorProfile)
      .values({
        userId: uid,
        name: `Dr ${uid.slice(0, 6)}`,
        slug: `dr-${uid}`,
        country: "SA",
        status: opts.status,
        published: opts.published,
        verified: true,
      })
      .returning({ id: doctorProfile.id })
    const id = doc[0].id
    created.doctors.push(id)
    if (opts.license) {
      await db.insert(doctorLicense).values({
        doctorId: id,
        numberEncrypted: "x",
        issuingAuthority: "Auth",
        expiryDate: opts.license.expiry,
        status: opts.license.status,
      })
    }
    return id
  }

  afterAll(async () => {
    for (const id of created.doctors)
      await db.delete(doctorProfile).where(eq(doctorProfile.id, id))
    for (const id of created.users) await db.delete(user).where(eq(user.id, id))
    await pool.end()
  })

  it("includes approved+published doctor with a valid license", async () => {
    const id = await makeDoctor({
      status: "approved",
      published: true,
      license: { status: "VALID", expiry: "2999-12-31" },
    })
    const { results } = await searchDoctors({ pageSize: 50 })
    expect(results.some((r) => r.id === id)).toBe(true)
  })

  it("excludes doctor with an expired license", async () => {
    const id = await makeDoctor({
      status: "approved",
      published: true,
      license: { status: "EXPIRED", expiry: "2000-01-01" },
    })
    const { results } = await searchDoctors({ pageSize: 50 })
    expect(results.some((r) => r.id === id)).toBe(false)
  })

  it("excludes unapproved / unpublished doctor", async () => {
    const id = await makeDoctor({
      status: "pending",
      published: false,
      license: { status: "VALID", expiry: "2999-12-31" },
    })
    const { results } = await searchDoctors({ pageSize: 50 })
    expect(results.some((r) => r.id === id)).toBe(false)
  })
})
