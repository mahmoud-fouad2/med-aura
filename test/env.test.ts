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
