import { describe, it, expect } from "vitest"
import { decideManualPaymentEligibility } from "@/lib/pdf/manual-payment-eligibility"

describe("decideManualPaymentEligibility", () => {
  it("denies when the appointment doesn't exist", () => {
    const d = decideManualPaymentEligibility({ appointment: null })
    expect(d).toEqual({ allowed: false, reason: "not_found" })
  })

  it("allows recording a manual payment on a PENDING_PAYMENT appointment", () => {
    const d = decideManualPaymentEligibility({ appointment: { status: "PENDING_PAYMENT" } })
    expect(d).toEqual({ allowed: true })
  })

  it("refuses a duplicate payment on an already-confirmed appointment", () => {
    const d = decideManualPaymentEligibility({ appointment: { status: "CONFIRMED" } })
    expect(d).toEqual({ allowed: false, reason: "already_paid_or_confirmed" })
  })

  it("refuses on a cancelled appointment", () => {
    const d = decideManualPaymentEligibility({ appointment: { status: "CANCELLED_BY_PATIENT" } })
    expect(d).toEqual({ allowed: false, reason: "already_paid_or_confirmed" })
  })

  it("refuses on a completed appointment", () => {
    const d = decideManualPaymentEligibility({ appointment: { status: "COMPLETED" } })
    expect(d).toEqual({ allowed: false, reason: "already_paid_or_confirmed" })
  })
})
