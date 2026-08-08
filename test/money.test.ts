import { describe, it, expect } from "vitest"
import {
  BASE_CURRENCY,
  formatMoney,
  formatTotals,
  hasMoney,
  headlineTotal,
  isMixedCurrency,
  sortTotals,
  totalIn,
} from "@/lib/money"

describe("money formatting", () => {
  it("renders the Arabic symbol with Latin digits", () => {
    expect(formatMoney(1250.5, "SAR")).toBe("1,250.5 ر.س")
    expect(formatMoney("50", "USD")).toBe("50 $")
  })

  it("falls back to the ISO code for unmapped currencies", () => {
    expect(formatMoney(10, "JPY")).toBe("10 JPY")
  })

  it("treats non-numeric input as zero rather than NaN", () => {
    expect(formatMoney("", "SAR")).toBe("0 ر.س")
  })
})

describe("cross-currency totals", () => {
  const mixed = [
    { currency: "USD", amount: 50 },
    { currency: "SAR", amount: 300 },
    { currency: "AED", amount: 0 },
  ]

  it("puts the base currency first and drops zero rows", () => {
    expect(sortTotals(mixed).map((t) => t.currency)).toEqual([BASE_CURRENCY, "USD"])
  })

  it("never merges currencies into one number", () => {
    // The regression this guards: 300 SAR + 50 USD used to render as "350 ر.س".
    expect(formatTotals(mixed)).toBe("300 ر.س · 50 $")
    expect(isMixedCurrency(mixed)).toBe(true)
  })

  it("headlines one currency and names the rest separately", () => {
    const { value, others } = headlineTotal(mixed)
    expect(value).toBe("300 ر.س")
    expect(others).toBe("50 $")
  })

  it("omits the 'others' line for a single currency", () => {
    expect(headlineTotal([{ currency: "USD", amount: 50 }])).toEqual({
      value: "50 $",
      others: null,
    })
  })

  it("shows a zero base-currency figure when nothing was collected", () => {
    expect(headlineTotal([])).toEqual({ value: "0 ر.س", others: null })
    expect(hasMoney([])).toBe(false)
    expect(hasMoney([{ currency: "SAR", amount: 0 }])).toBe(false)
  })

  it("reads a single currency out of a breakdown", () => {
    expect(totalIn(mixed, "USD")).toBe(50)
    expect(totalIn(mixed, "EUR")).toBe(0)
  })
})
