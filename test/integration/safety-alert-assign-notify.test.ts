import { describe, it, expect, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, notification } from "@/lib/db/schema"
import { notify } from "@/lib/notifications"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

/**
 * assignSafetyAlert (lib/actions/safety.ts) previously updated assignedTo
 * and wrote an audit row but never told the new assignee — they'd only find
 * out by checking the dashboard themselves. The fix calls notify() with the
 * same shape exercised here; assignSafetyAlert itself can't be called
 * directly in this test env (requireUser() needs a real request/cookie
 * context, which nothing in this suite mocks), so this proves the
 * persisted-notification contract the fix relies on.
 */
describe.skipIf(!HAS_DB)("safety alert assignment notification", () => {
  const assigneeId = rid()

  afterAll(async () => {
    await db.delete(notification).where(eq(notification.userId, assigneeId))
    await db.delete(user).where(eq(user.id, assigneeId))
    await pool.end()
  })

  it("persists a readable in-app notification for the assignee", async () => {
    await db.insert(user).values({ id: assigneeId, name: "Assignee", email: `assignee-${assigneeId}@t.local` })

    await notify({
      userId: assigneeId,
      type: "safety_alert.assigned",
      title: "تم إسناد تنبيه سلامة إليك (حرجة)",
      body: "تورم غير متوقع بعد 3 أيام من الإجراء",
      caseId: undefined,
      href: "/dashboard/cases/some-case-id",
    })

    const rows = await db.select().from(notification).where(eq(notification.userId, assigneeId))
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe("safety_alert.assigned")
    expect(rows[0].href).toBe("/dashboard/cases/some-case-id")
    expect(rows[0].readAt).toBeNull()
  })
})
