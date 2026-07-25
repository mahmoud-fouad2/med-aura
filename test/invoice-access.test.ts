import { describe, it, expect } from "vitest"
import { decideInvoiceAccess } from "@/lib/pdf/invoice-access"

const PAYER_ID = "payer-1"

describe("decideInvoiceAccess", () => {
  it("denies when the payment doesn't exist", () => {
    const d = decideInvoiceAccess({ payment: null, viewerId: "someone", isFinanceOrAdmin: false })
    expect(d).toEqual({ allowed: false, reason: "not_found" })
  })

  it("denies an anonymous viewer even for a real payment", () => {
    const d = decideInvoiceAccess({
      payment: { payerUserId: PAYER_ID },
      viewerId: null,
      isFinanceOrAdmin: false,
    })
    expect(d).toEqual({ allowed: false, reason: "not_authorized" })
  })

  it("allows the payer to download their own receipt", () => {
    const d = decideInvoiceAccess({
      payment: { payerUserId: PAYER_ID },
      viewerId: PAYER_ID,
      isFinanceOrAdmin: false,
    })
    expect(d).toEqual({ allowed: true })
  })

  it("denies a different patient", () => {
    const d = decideInvoiceAccess({
      payment: { payerUserId: PAYER_ID },
      viewerId: "another-patient",
      isFinanceOrAdmin: false,
    })
    expect(d).toEqual({ allowed: false, reason: "not_authorized" })
  })

  it("allows finance/admin to download any payment's receipt", () => {
    const d = decideInvoiceAccess({
      payment: { payerUserId: PAYER_ID },
      viewerId: "finance-staff",
      isFinanceOrAdmin: true,
    })
    expect(d).toEqual({ allowed: true })
  })

  it("denies a doctor who is neither the payer nor finance/admin", () => {
    const d = decideInvoiceAccess({
      payment: { payerUserId: PAYER_ID },
      viewerId: "doctor-1",
      isFinanceOrAdmin: false,
    })
    expect(d).toEqual({ allowed: false, reason: "not_authorized" })
  })
})
