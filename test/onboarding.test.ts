import { describe, expect, it } from "vitest"
import { normalizeSignupPhone } from "@/lib/onboarding/validation"

describe("normalizeSignupPhone", () => {
  it("normalizes Saudi local mobile numbers", () => {
    expect(normalizeSignupPhone("0530047640", "SA")).toBe("+966530047640")
    expect(normalizeSignupPhone("530047640", "SA")).toBe("+966530047640")
  })

  it("keeps valid international numbers in E.164 style", () => {
    expect(normalizeSignupPhone("+966530047640", "SA")).toBe("+966530047640")
    expect(normalizeSignupPhone("00971501234567", "AE")).toBe("+971501234567")
  })

  it("rejects invalid phone numbers with a safe user message", () => {
    expect(() => normalizeSignupPhone("abc123", "SA")).toThrow(/رقم الهاتف غير صالح/)
  })
})
