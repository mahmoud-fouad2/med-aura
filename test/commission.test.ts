import { describe, expect, it } from "vitest"
import { calculateCommissionSnapshot } from "@/lib/money"

describe("calculateCommissionSnapshot", () => {
  it("calculates commission on subtotal and preserves tax in provider net", () => {
    expect(calculateCommissionSnapshot("1000.00", "1150.00", "15.00")).toEqual({
      rate: "15.00",
      commissionAmount: "150.00",
      providerNetAmount: "1000.00",
    })
  })

  it("rounds to the smallest currency unit", () => {
    expect(calculateCommissionSnapshot("99.99", "99.99", "12.50")).toEqual({
      rate: "12.50",
      commissionAmount: "12.50",
      providerNetAmount: "87.49",
    })
  })

  it("rejects invalid rates", () => {
    expect(() => calculateCommissionSnapshot("100", "100", "100.01")).toThrow()
  })
})
