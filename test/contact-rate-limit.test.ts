import { describe, it, expect, afterAll, vi } from "vitest"
import { submitContactMessage } from "@/lib/actions/contact"
import { db, pool } from "@/lib/db"
import { contactMessage } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const { testIp } = vi.hoisted(() => ({
  testIp: `192.0.2.${Math.floor(Math.random() * 200) + 10}`,
}))

vi.mock("@/lib/audit", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/audit")>()
  return {
    ...mod,
    requestMeta: vi.fn().mockResolvedValue({
      ip: testIp,
      userAgent: "vitest-agent",
    }),
    writeAudit: vi.fn().mockResolvedValue(undefined),
  }
})

const HAS_DB = Boolean(process.env.DATABASE_URL)

describe.skipIf(!HAS_DB)("Contact Form Rate Limiting", () => {
  const testEmail = `rl-${Date.now()}@example.com`

  afterAll(async () => {
    await db.delete(contactMessage).where(eq(contactMessage.email, testEmail))
    await pool.end()
  })

  it("blocks rapid automated submissions from the same IP after limit is reached", async () => {
    const payload = {
      name: "Flooder",
      email: testEmail,
      subject: "Inquiry regarding services",
      message: "This is a detailed message from an applicant looking for information.",
    }

    // First 5 requests should succeed
    for (let i = 0; i < 5; i++) {
      const res = await submitContactMessage(payload)
      expect(res.ok).toBe(true)
    }

    // 6th request from the same IP should be blocked by rate limit
    const blockedRes = await submitContactMessage(payload)
    expect(blockedRes.ok).toBe(false)
    if (!blockedRes.ok) expect(blockedRes.error).toContain("تم إرسال عدد كبير من الرسائل")
  }, 25_000)
})
