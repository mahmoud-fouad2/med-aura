import { describe, it, expect, afterAll } from "vitest"
import { and, eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, notificationPreference } from "@/lib/db/schema"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

/**
 * sendBroadcastAction itself can't be called directly here — requireUser()
 * needs a real request/cookie context nothing in this suite mocks (same
 * limitation as the support-ticket and safety-alert integration tests).
 * This instead builds the exact recipient-selection query the action runs
 * (role filter + inner join on offersEnabled=true) against real rows, which
 * is the part with real risk of a mistake (silently including/excluding
 * the wrong people).
 */
describe.skipIf(!HAS_DB)("broadcast recipient selection", () => {
  const optedInPatientId = rid()
  const optedOutPatientId = rid()
  const noRowPatientId = rid()
  const optedInDoctorId = rid()

  afterAll(async () => {
    for (const id of [optedInPatientId, optedOutPatientId, noRowPatientId, optedInDoctorId]) {
      await db.delete(notificationPreference).where(eq(notificationPreference.userId, id))
      await db.delete(user).where(eq(user.id, id))
    }
    await pool.end()
  })

  async function selectRecipients(roleCondition: ReturnType<typeof eq> | undefined) {
    return db
      .select({ id: user.id })
      .from(user)
      .innerJoin(
        notificationPreference,
        and(eq(notificationPreference.userId, user.id), eq(notificationPreference.offersEnabled, true)),
      )
      .where(roleCondition)
  }

  it("only includes users who explicitly opted in, and respects the role filter", async () => {
    await db.insert(user).values([
      { id: optedInPatientId, name: "Opted-in patient", email: `p1-${optedInPatientId}@t.local`, role: "patient" },
      { id: optedOutPatientId, name: "Opted-out patient", email: `p2-${optedOutPatientId}@t.local`, role: "patient" },
      { id: noRowPatientId, name: "Never touched toggle", email: `p3-${noRowPatientId}@t.local`, role: "patient" },
      { id: optedInDoctorId, name: "Opted-in doctor", email: `d1-${optedInDoctorId}@t.local`, role: "doctor" },
    ])
    await db.insert(notificationPreference).values([
      { userId: optedInPatientId, offersEnabled: true },
      { userId: optedOutPatientId, offersEnabled: false },
      { userId: optedInDoctorId, offersEnabled: true },
      // noRowPatientId intentionally has no row — the default-false fallback path.
    ])

    const all = await selectRecipients(undefined)
    const allIds = all.map((r) => r.id)
    expect(allIds).toContain(optedInPatientId)
    expect(allIds).toContain(optedInDoctorId)
    expect(allIds).not.toContain(optedOutPatientId)
    expect(allIds).not.toContain(noRowPatientId)

    const patientsOnly = await selectRecipients(eq(user.role, "patient"))
    const patientIds = patientsOnly.map((r) => r.id)
    expect(patientIds).toContain(optedInPatientId)
    expect(patientIds).not.toContain(optedInDoctorId)
  })
})
