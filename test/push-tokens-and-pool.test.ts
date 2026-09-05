import { describe, it, expect, afterAll, vi } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, pushToken } from "@/lib/db/schema"
import { POST as registerPushToken } from "@/app/api/mobile/v1/push-tokens/route"
import { sendPushToUser } from "@/lib/push"
import * as mobileApiModule from "@/lib/mobile-api"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Push Token Lifecycle & Database Pool Resilience (Findings 14 & 15)", { timeout: 30000 }, () => {
  const testUserId = rid()
  const validToken = "ExponentPushToken[TestValidTokenxxxxxxxx12]"
  const invalidToken = "invalid-token-format-12345"

  afterAll(async () => {
    await db.delete(pushToken).where(eq(pushToken.userId, testUserId))
    await db.delete(user).where(eq(user.id, testUserId))
    await pool.end()
  })

  it("rejects invalid push tokens and accepts valid Expo push tokens on mobile registration", async () => {
    // 1. Seed test user
    await db.insert(user).values({
      id: testUserId,
      name: "Mobile Test User",
      email: `mtest-${testUserId}@t.local`,
      role: "patient",
    })

    // 2. Mock requireMobileUser
    vi.spyOn(mobileApiModule, "requireMobileUser").mockResolvedValue({
      ok: true,
      user: {
        id: testUserId,
        email: `mtest-${testUserId}@t.local`,
        name: "Mobile Test User",
        role: "patient",
        emailVerified: true,
        image: null,
      },
      roles: ["patient"],
    } as any)

    // 3. Attempt registration with an invalid token string
    const invalidReq = new Request("http://localhost/api/mobile/v1/push-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: invalidToken, platform: "android" }),
    })
    const invalidRes = await registerPushToken(invalidReq)
    expect(invalidRes.status).toBe(400)
    const invalidJson = await invalidRes.json()
    expect(invalidJson.error).toContain("رمز إشعار Expo غير صالح")

    // 4. Attempt registration with a valid Expo token
    const validReq = new Request("http://localhost/api/mobile/v1/push-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: validToken, platform: "android" }),
    })
    const validRes = await registerPushToken(validReq)
    expect(validRes.status).toBe(200)
    const validJson = await validRes.json()
    expect(validJson.ok).toBe(true)
    expect(validJson.data.registered).toBe(true)

    // 5. Verify database contains the valid token
    const inDb = await db
      .select({ token: pushToken.token })
      .from(pushToken)
      .where(eq(pushToken.userId, testUserId))
    expect(inDb.some((r) => r.token === validToken)).toBe(true)
    expect(inDb.some((r) => r.token === invalidToken)).toBe(false)
  })

  it("automatically purges invalid or malformed tokens from the database during sendPushToUser", async () => {
    // Insert a legacy/malformed token directly into DB
    const legacyMalformedToken = "malformed-junk-token-in-db-99"
    await db.insert(pushToken).values({
      userId: testUserId,
      token: legacyMalformedToken,
      platform: "android",
    })

    // Confirm it's in the DB
    const beforeSend = await db
      .select({ token: pushToken.token })
      .from(pushToken)
      .where(eq(pushToken.userId, testUserId))
    expect(beforeSend.some((r) => r.token === legacyMalformedToken)).toBe(true)

    // Run sendPushToUser (best effort)
    await sendPushToUser(testUserId, { title: "Test Notification", body: "Hello" })

    // Verify the malformed token was purged from the DB
    const afterSend = await db
      .select({ token: pushToken.token })
      .from(pushToken)
      .where(eq(pushToken.userId, testUserId))
    expect(afterSend.some((r) => r.token === legacyMalformedToken)).toBe(false)
  })

  it("verifies database connection pool has connection timeout configured and handles concurrent queries", async () => {
    // 1. Verify connectionTimeoutMillis is configured to prevent infinite hanging
    expect(pool.options.connectionTimeoutMillis).toBeDefined()
    expect(pool.options.connectionTimeoutMillis).toBeGreaterThanOrEqual(1000)
    expect(pool.options.max).toBeGreaterThanOrEqual(10)

    // 2. Concurrently execute queries against the pool
    const queries = Array.from({ length: 12 }, (_, i) =>
      pool.query("SELECT $1::int AS index, 1 AS ok", [i]),
    )
    const results = await Promise.all(queries)
    expect(results).toHaveLength(12)
    results.forEach((res, i) => {
      expect(res.rows[0].index).toBe(i)
      expect(res.rows[0].ok).toBe(1)
    })
  })
})
