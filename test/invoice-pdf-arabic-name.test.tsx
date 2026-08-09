import { describe, it, expect } from "vitest"
import { prepareTextForPdf, renderInvoiceReceipt } from "@/lib/pdf/invoice-receipt-renderer"
import type { PaymentReceiptData } from "@/lib/data/invoice"

const BASE = {
  paymentId: "00000000-0000-0000-0000-000000000001",
  reference: "PAY-TEST0001",
  purpose: "CONSULTATION_FEE",
  status: "PAID",
  amount: "300.00",
  currency: "SAR",
  provider: "manual",
  paidAt: new Date("2026-08-06T00:00:00.000Z"),
  createdAt: new Date("2026-08-06T19:02:26.433Z"),
  payerUserId: "test-payer",
  payerName: "Ali Mohamed",
  payerEmail: "qa@medauraworld.com",
  appointmentReference: "APT-TEST0001",
  appointmentType: "VIDEO_CONSULTATION",
  appointmentStartsAt: new Date("2026-08-09T13:00:00.000Z"),
  doctorName: "د. سارة العتيبي",
  centerName: "مركز نور للتجميل",
  serviceNameEn: null,
} as unknown as PaymentReceiptData

const render = (payerName: string) =>
  renderInvoiceReceipt({ ...BASE, payerName })

/** A real PDF starts with the %PDF- header; an HTML error page does not. */
const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-"
const pageCount = (buf: Buffer) =>
  buf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0

describe("invoice receipt PDF", () => {
  it("joins and reorders Arabic for PDFKit's LTR-only font layout", () => {
    expect(prepareTextForPdf("علي محمد")).toBe("ﺪﻤﺤﻣ ﻲﻠﻋ")
    expect(prepareTextForPdf("Dr. أحمد Ahmed")).toBe("Dr. ﺪﻤﺣﺃ Ahmed")
    expect(prepareTextForPdf("د.\u200f سارة العتيبي")).not.toContain("\u200f")
    expect(prepareTextForPdf("Ali Mohamed")).toBe("Ali Mohamed")
  })

  it("renders Latin then Arabic receipts as single-page PDFs", async () => {
    const latin = await render("Ali Mohamed")
    const arabic = await render("علي محمد")
    expect(isPdf(latin)).toBe(true)
    expect(isPdf(arabic)).toBe(true)
    expect(pageCount(latin)).toBe(1)
    expect(pageCount(arabic)).toBe(1)
    expect(latin.length).toBeGreaterThan(1000)
    expect(arabic.length).toBeGreaterThan(1000)
  }, 60_000)
})
