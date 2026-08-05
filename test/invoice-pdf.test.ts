import { describe, expect, it } from "vitest"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoiceDocument, splitByScript } from "@/lib/pdf/invoice-document"
import type { PaymentReceiptData } from "@/lib/data/invoice"

function receipt(overrides: Partial<PaymentReceiptData> = {}): PaymentReceiptData {
  return {
    paymentId: "pay_1",
    reference: "PAY-A08577D2",
    purpose: "CONSULTATION_FEE",
    status: "PAID",
    amount: "50.00",
    currency: "USD",
    provider: "manual",
    paidAt: new Date("2026-08-04"),
    createdAt: new Date("2026-08-04"),
    payerUserId: "user_1",
    payerName: "Gomana amr alsheemy",
    payerEmail: "s596886@rg.moe.gov.sa",
    appointmentReference: "APT-27673297",
    appointmentType: "VIDEO_CONSULTATION",
    appointmentStartsAt: new Date("2026-08-04"),
    doctorName: "د. محمد أحمد العتيبي",
    centerName: "مركز الرعاية الطبية الحديثة",
    serviceNameEn: null,
    ...overrides,
  }
}

describe("InvoiceDocument", () => {
  it("renders Arabic doctor/center names without throwing", async () => {
    const buf = await renderToBuffer(InvoiceDocument({ data: receipt() }))
    expect(buf.length).toBeGreaterThan(1000)
  })

  it("renders Latin names unaffected", async () => {
    const buf = await renderToBuffer(
      InvoiceDocument({ data: receipt({ doctorName: "Dr. Sara Al-Otaibi", centerName: "Riyadh Care Center" }) }),
    )
    expect(buf.length).toBeGreaterThan(1000)
  })

  it("stays stable across many repeated renders in one process (regression: .woff2 corrupted subset state after ~2 renders)", async () => {
    const sizes: number[] = []
    for (let i = 0; i < 6; i++) {
      const buf = await renderToBuffer(InvoiceDocument({ data: receipt() }))
      sizes.push(buf.length)
    }
    expect(sizes.every((s) => s === sizes[0])).toBe(true)
  })

  it("handles a null doctor/center gracefully", async () => {
    const buf = await renderToBuffer(InvoiceDocument({ data: receipt({ doctorName: null, centerName: null }) }))
    expect(buf.length).toBeGreaterThan(1000)
  })
})

describe("splitByScript", () => {
  it("keeps a whole Arabic name — including its spaces — as one run (regression: fragmented at every space, breaking letter-joining across fragments)", () => {
    expect(splitByScript("محمد أحمد العتيبي")).toEqual([
      { text: "محمد أحمد العتيبي", arabic: true },
    ])
  })

  it("ends the run right after a period closing Arabic text, rather than merging what follows into it (regression: an Arabic letter immediately before '.' got substituted for the wrong glyph whenever more Arabic text followed in the same *rendered* run — real doctor name 'د. أحمد يلماز' rendered as 'ج أحمد يلم ز'; only fixed once each part also renders as its own sibling <Text> — see NameValue)", () => {
    expect(splitByScript("د. أحمد يلماز")).toEqual([
      { text: "د.", arabic: true },
      { text: " أحمد يلماز", arabic: true },
    ])
  })

  it("still splits at a real script change, attaching neutral characters to the preceding run", () => {
    expect(splitByScript("Dr. محمد Ahmed")).toEqual([
      { text: "Dr. ", arabic: false },
      { text: "محمد ", arabic: true },
      { text: "Ahmed", arabic: false },
    ])
  })
})
