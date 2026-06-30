import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { query, isEmptyData } from "@/lib/db/query"

describe("query() result classification", () => {
  const prev = process.env.DATABASE_URL
  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://test"
  })
  afterEach(() => {
    if (prev === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = prev
  })

  it("returns ok with data on success", async () => {
    const r = await query(async () => [1, 2, 3])
    expect(r.status).toBe("ok")
    if (r.status === "ok") expect(r.data).toEqual([1, 2, 3])
  })

  it("classifies missing-table (42P01) as unavailable, not error", async () => {
    const r = await query(async () => {
      throw Object.assign(new Error("relation does not exist"), { code: "42P01" })
    })
    expect(r.status).toBe("unavailable")
  })

  it("classifies a wrapped (cause.code) schema error as unavailable", async () => {
    const r = await query(async () => {
      throw { message: "wrapped", cause: { code: "42703" } }
    })
    expect(r.status).toBe("unavailable")
  })

  it("classifies unexpected errors as error with a requestId", async () => {
    const r = await query(async () => {
      throw new Error("boom")
    })
    expect(r.status).toBe("error")
    if (r.status === "error") expect(r.requestId).toMatch(/^[0-9a-f]{8}$/)
  })

  it("returns unavailable when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL
    const r = await query(async () => [1])
    expect(r.status).toBe("unavailable")
  })

  it("isEmptyData detects empty arrays and null", () => {
    expect(isEmptyData([])).toBe(true)
    expect(isEmptyData([1])).toBe(false)
    expect(isEmptyData(null)).toBe(true)
  })
})
