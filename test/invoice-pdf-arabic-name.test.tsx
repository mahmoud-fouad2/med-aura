import fs from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
// @ts-expect-error @react-pdf/pdfkit has no type declarations.
import PDFDocument from "@react-pdf/pdfkit"
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

  it("embeds a font covering every glyph the reshaper emits (no tofu)", () => {
    // The PDF font must contain the Arabic Presentation-Forms glyphs the
    // reshaper outputs — including the isolated forms of non-joining letters
    // (alef, dal, reh, teh-marbuta) that the old Alexandria subset lacked.
    const doc = new PDFDocument()
    const arabicFontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "pdf",
      "ibm-plex-arabic-400-normal.woff",
    )
    expect(fs.existsSync(arabicFontPath)).toBe(true)
    doc.registerFont("Arabic", arabicFontPath)
    doc.font("Arabic")
    const fontkitFont = doc._font.font as {
      glyphForCodePoint(cp: number): { id: number } | null
    }

    const names = ["د. سارة العتيبي", "مركز نور للتجميل", "نجلاء الشمري", "إبراهيم عبدالرحمن"]
    const missing = new Set<string>()
    for (const name of names) {
      for (const ch of prepareTextForPdf(name)) {
        const cp = ch.codePointAt(0)!
        if (cp < 0x0600) continue // Latin/space handled by Helvetica
        const glyph = fontkitFont.glyphForCodePoint(cp)
        if (!glyph || glyph.id === 0) missing.add("U+" + cp.toString(16).toUpperCase())
      }
    }
    expect([...missing]).toEqual([])
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
