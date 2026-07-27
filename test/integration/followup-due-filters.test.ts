import { describe, it, expect, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, aestheticCase, procedure, followUpPlan, followUpTask } from "@/lib/db/schema"
import { listFollowUpsForAdmin } from "@/lib/data/admin-followups"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

/**
 * Proves the "today"/"upcoming" date-range boundaries added to
 * listFollowUpsForAdmin don't off-by-one at midnight: a task due earlier
 * today shows under "today" (not "upcoming" or "overdue"), one due
 * tomorrow shows under "upcoming" (not "today"), and one due yesterday
 * shows under neither.
 */
describe.skipIf(!HAS_DB)("listFollowUpsForAdmin due-date filters", () => {
  const patientId = rid()
  const caseId = rid()
  const planId = rid()
  let procedureId = ""

  // "Due today" must be a still-future moment relative to whenever this test
  // actually runs — a fixed clock time (e.g. 15:00) is wrong once the wall
  // clock passes it, since a DUE task past its dueAt genuinely is overdue.
  const now = new Date()
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const dueToday = new Date(Math.min(now.getTime() + 5 * 60 * 1000, startOfTomorrow.getTime() - 60 * 1000))
  const dueTomorrow = new Date(startOfTomorrow.getTime() + 12 * 60 * 60 * 1000)
  const dueYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  afterAll(async () => {
    await db.delete(followUpTask).where(eq(followUpTask.planId, planId))
    await db.delete(followUpPlan).where(eq(followUpPlan.id, planId))
    await db.delete(aestheticCase).where(eq(aestheticCase.id, caseId))
    await db.delete(user).where(eq(user.id, patientId))
    await pool.end()
  })

  it("buckets tasks correctly across the midnight boundary", async () => {
    const proc = (await db.select({ id: procedure.id }).from(procedure).limit(1))[0]
    if (!proc) throw new Error("test requires at least one existing procedure row")
    procedureId = proc.id

    await db.insert(user).values({ id: patientId, name: "Patient", email: `p-${patientId}@t.local` })
    await db.insert(aestheticCase).values({
      id: caseId,
      reference: `CASE-${rid().slice(0, 8)}`,
      patientUserId: patientId,
      procedureId,
      status: "FOLLOW_UP",
    })
    await db.insert(followUpPlan).values({ id: planId, caseId })
    await db.insert(followUpTask).values([
      { planId, title: "Due today", dueAt: dueToday, status: "DUE" },
      { planId, title: "Due tomorrow", dueAt: dueTomorrow, status: "SCHEDULED" },
      { planId, title: "Due yesterday (overdue)", dueAt: dueYesterday, status: "SCHEDULED" },
    ])

    const [today, upcoming, overdue] = await Promise.all([
      listFollowUpsForAdmin({ status: "today" }),
      listFollowUpsForAdmin({ status: "upcoming" }),
      listFollowUpsForAdmin({ status: "overdue" }),
    ])

    expect(today.some((t) => t.title === "Due today")).toBe(true)
    expect(today.some((t) => t.title === "Due tomorrow")).toBe(false)
    expect(today.some((t) => t.title === "Due yesterday (overdue)")).toBe(false)

    expect(upcoming.some((t) => t.title === "Due tomorrow")).toBe(true)
    expect(upcoming.some((t) => t.title === "Due today")).toBe(false)

    expect(overdue.some((t) => t.title === "Due yesterday (overdue)")).toBe(true)
    expect(overdue.some((t) => t.title === "Due today")).toBe(false)
  })
})
