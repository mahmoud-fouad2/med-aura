import { describe, it, expect } from "vitest"
import { decideManualPaymentCancelEligibility } from "@/lib/pdf/manual-payment-cancel-eligibility"

describe("decideManualPaymentCancelEligibility", () => {
  it("denies when the payment doesn't exist", () => {
    const d = decideManualPaymentCancelEligibility({ payment: null, hasBlockingRefund: false })
    expect(d).toEqual({ allowed: false, reason: "not_found" })
  })

  it("allows cancelling a PAID manual payment with no refund in flight", () => {
    const d = decideManualPaymentCancelEligibility({
      payment: { provider: "manual", status: "PAID" },
      hasBlockingRefund: false,
    })
    expect(d).toEqual({ allowed: true })
  })

  it("refuses a stripe payment even if PAID", () => {
    const d = decideManualPaymentCancelEligibility({
      payment: { provider: "stripe", status: "PAID" },
      hasBlockingRefund: false,
    })
    expect(d).toEqual({ allowed: false, reason: "not_manual" })
  })

  it("refuses a manual payment that isn't PAID", () => {
    const d = decideManualPaymentCancelEligibility({
      payment: { provider: "manual", status: "CANCELLED" },
      hasBlockingRefund: false,
    })
    expect(d).toEqual({ allowed: false, reason: "not_paid" })
  })

  it("refuses when a refund request is already in flight", () => {
    const d = decideManualPaymentCancelEligibility({
      payment: { provider: "manual", status: "PAID" },
      hasBlockingRefund: true,
    })
    expect(d).toEqual({ allowed: false, reason: "blocking_refund" })
  })

  it("provider check takes priority over the refund check", () => {
    const d = decideManualPaymentCancelEligibility({
      payment: { provider: "stripe", status: "PAID" },
      hasBlockingRefund: true,
    })
    expect(d).toEqual({ allowed: false, reason: "not_manual" })
  })
})
