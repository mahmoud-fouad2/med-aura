import { describe, it, expect, vi, afterEach } from "vitest"

/**
 * assertCoreEnv() gates server startup. lib/env caches process.env on first read,
 * so each case resets modules and rebuilds process.env before importing.
 */
const BASE = { ...process.env }

afterEach(() => {
  process.env = { ...BASE }
  vi.resetModules()
})

async function load(overrides: Record<string, string | undefined>) {
  vi.resetModules()
  process.env = { ...BASE, ...overrides } as NodeJS.ProcessEnv
  return import("@/lib/env")
}

const PROD_OK = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(24),
  ENCRYPTION_KEY: "a".repeat(64),
  ENABLE_DEMO_DATA: "false",
}

describe("assertCoreEnv", () => {
  it("accepts medauraworld.com as the production app URL", async () => {
    const { appUrl, assertCoreEnv, trustedAuthOrigins } = await load({
      ...PROD_OK,
      APP_URL: " https://medauraworld.com ",
      BETTER_AUTH_URL: "https://medauraworld.com",
    })

    expect(() => assertCoreEnv()).not.toThrow()
    expect(appUrl()).toBe("https://medauraworld.com")
    expect(trustedAuthOrigins()).toContain("https://medauraworld.com")
    expect(trustedAuthOrigins()).toContain("https://www.medauraworld.com")
  })

  it("accepts the Render service URL", async () => {
    const { appUrl, assertCoreEnv } = await load({
      ...PROD_OK,
      APP_URL: "https://med-aura.onrender.com",
      BETTER_AUTH_URL: "https://med-aura.onrender.com",
    })

    expect(() => assertCoreEnv()).not.toThrow()
    expect(appUrl()).toBe("https://med-aura.onrender.com")
  })

  it("rejects an APP_URL without protocol", async () => {
    const { assertCoreEnv } = await load({
      ...PROD_OK,
      APP_URL: "medauraworld.com",
    })

    expect(() => assertCoreEnv()).toThrow(/APP_URL must be a valid absolute URL/)
  })

  it("rejects public APP_URL values that do not use https", async () => {
    const { assertCoreEnv } = await load({
      ...PROD_OK,
      APP_URL: "http://medauraworld.com",
    })

    expect(() => assertCoreEnv()).toThrow(/APP_URL must use https/)
  })

  it("rejects a pasted KEY=value pair in the APP_URL value", async () => {
    const { assertCoreEnv } = await load({
      ...PROD_OK,
      APP_URL: "APP_URL=https://medauraworld.com",
    })

    expect(() => assertCoreEnv()).toThrow(/Do not paste "APP_URL=/)
  })

  it("does not report present core variables as missing when APP_URL is invalid", async () => {
    const { assertCoreEnv } = await load({
      ...PROD_OK,
      APP_URL: "APP_URL=https://medauraworld.com",
    })

    expect(() => assertCoreEnv()).toThrow(/APP_URL value must be only the URL/)
    try {
      assertCoreEnv()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      expect(message).not.toMatch(/missing core variables/)
      expect(message).not.toMatch(/DATABASE_URL/)
      expect(message).not.toMatch(/BETTER_AUTH_SECRET/)
      expect(message).not.toMatch(/ENCRYPTION_KEY/)
    }
  })

  it("does not include secret values in startup errors", async () => {
    const secret = "prod-secret-should-never-print"
    const encryptionKey = "b".repeat(64)
    const { assertCoreEnv } = await load({
      ...PROD_OK,
      BETTER_AUTH_SECRET: secret,
      ENCRYPTION_KEY: encryptionKey,
      APP_URL: "medauraworld.com",
    })

    try {
      assertCoreEnv()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      expect(message).not.toContain(secret)
      expect(message).not.toContain(encryptionKey)
      return
    }
    throw new Error("expected assertCoreEnv to throw")
  })

  it("throws in production when DATABASE_URL is missing", async () => {
    const { assertCoreEnv } = await load({ ...PROD_OK, DATABASE_URL: undefined })
    expect(() => assertCoreEnv()).toThrow(/DATABASE_URL/)
  })

  it("throws in production when ENCRYPTION_KEY is missing", async () => {
    const { assertCoreEnv } = await load({ ...PROD_OK, ENCRYPTION_KEY: undefined })
    expect(() => assertCoreEnv()).toThrow(/ENCRYPTION_KEY/)
  })

  it("throws in production when ENABLE_DEMO_DATA=true", async () => {
    const { assertCoreEnv } = await load({ ...PROD_OK, ENABLE_DEMO_DATA: "true" })
    expect(() => assertCoreEnv()).toThrow(/ENABLE_DEMO_DATA/)
  })

  it("does NOT throw in development when core vars are missing (degraded mode)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { assertCoreEnv } = await load({
      NODE_ENV: "development",
      DATABASE_URL: undefined,
      BETTER_AUTH_SECRET: undefined,
    })
    expect(() => assertCoreEnv()).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("passes in production when core vars are present and demo disabled", async () => {
    const { assertCoreEnv } = await load(PROD_OK)
    expect(() => assertCoreEnv()).not.toThrow()
  })
})
