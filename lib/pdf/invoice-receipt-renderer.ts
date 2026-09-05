import fs from "node:fs"
import path from "node:path"
// @ts-expect-error @react-pdf/pdfkit is a transitive runtime dependency without declarations.
import PDFDocument from "@react-pdf/pdfkit"
// @ts-expect-error bidi-js does not publish TypeScript declarations.
import bidiFactory from "bidi-js"
// @ts-expect-error arabic-persian-reshaper does not publish TypeScript declarations.
import reshaper from "arabic-persian-reshaper"
import type { PaymentReceiptData } from "@/lib/data/invoice"

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 42
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const PRIMARY = "#4A1D96"
const INK = "#211B2E"
const MUTED = "#6B6470"
const BORDER = "#E4DEEC"
const SURFACE = "#F7F3FC"
const ARABIC_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/
const INVISIBLE_DIRECTIONAL_RE = /[\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g

const assetsRoot = path.join(process.cwd(), "public")
// IBM Plex Sans Arabic (the brand font) with full Arabic Presentation-Forms
// coverage. The prior Alexandria web-subset was missing the isolated forms of
// non-joining letters (alef, dal, reh, teh-marbuta), so names like "سارة" and
// "نور" rendered with tofu boxes. See public/fonts/pdf.
const arabicFont = path.join(assetsRoot, "fonts", "pdf", "ibm-plex-arabic-400-normal.woff")
const arabicBoldFont = path.join(assetsRoot, "fonts", "pdf", "ibm-plex-arabic-700-normal.woff")
const logo = fs.readFileSync(path.join(assetsRoot, "brand", "med-aura-logo.png"))

const PURPOSE_LABEL: Record<string, string> = {
  CONSULTATION_FEE: "Consultation Fee",
  DEPOSIT: "Deposit",
  PARTIAL_PAYMENT: "Partial Payment",
  FINAL_PAYMENT: "Final Payment",
  SERVICE_FEE: "Service Fee",
}

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  VIDEO_CONSULTATION: "Video Consultation",
  IN_PERSON_CONSULTATION: "In-Person Consultation",
  PHONE_CONSULTATION: "Phone Consultation",
  PROCEDURE: "Procedure",
  FOLLOW_UP: "Follow-up",
}

const PROVIDER_LABEL: Record<string, string> = {
  stripe: "Card (Stripe)",
  manual: "Manual / Offline",
  test: "Test payment (QA)",
}

type BidiEmbeddingLevels = {
  levels: Uint8Array
  paragraphs: { start: number; end: number; level: number }[]
}

type BidiApi = {
  getEmbeddingLevels(value: string, direction: "auto"): BidiEmbeddingLevels
  getReorderedString(value: string, levels: BidiEmbeddingLevels): string
}

const bidi = (bidiFactory as () => BidiApi)()

function hasArabic(value: string): boolean {
  return ARABIC_RE.test(value)
}

/** PDFKit shapes every font run as LTR internally. Convert Arabic logical
 * text into joined presentation forms in visual order before drawing it. */
export function prepareTextForPdf(value: string): string {
  const cleanValue = value.replace(INVISIBLE_DIRECTIONAL_RE, "")
  if (!hasArabic(cleanValue)) return cleanValue
  const shaped = reshaper.ArabicShaper.convertArabic(cleanValue) as string
  return bidi.getReorderedString(shaped, bidi.getEmbeddingLevels(shaped, "auto"))
}

function splitFontRuns(value: string): { value: string; arabic: boolean }[] {
  const runs: { value: string; arabic: boolean }[] = []
  for (const char of value) {
    const arabic = hasArabic(char)
    const previous = runs.at(-1)
    if (previous?.arabic === arabic) previous.value += char
    else runs.push({ value: char, arabic })
  }
  return runs
}

function formatDate(value: Date | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatMoney(amount: string, currency: string): string {
  return `${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

function text(
  doc: InstanceType<typeof PDFDocument>,
  value: string,
  x: number,
  y: number,
  width: number,
  options: { size?: number; color?: string; bold?: boolean; align?: "left" | "right" | "center" } = {},
) {
  const arabic = hasArabic(value)
  if (arabic) {
    const runs = splitFontRuns(prepareTextForPdf(value))
    const fontFor = (run: { arabic: boolean }) =>
      run.arabic ? (options.bold ? "ArabicBold" : "Arabic") : options.bold ? "Helvetica-Bold" : "Helvetica"
    let fontSize = options.size ?? 10
    const measure = () =>
      runs.reduce((total, run) => {
        doc.font(fontFor(run)).fontSize(fontSize)
        return total + doc.widthOfString(run.value)
      }, 0)
    let renderedWidth = measure()
    if (renderedWidth > width) {
      fontSize = Math.max(7, fontSize * (width / renderedWidth))
      renderedWidth = measure()
    }
    const align = options.align ?? "right"
    let cursor =
      align === "right"
        ? x + width - renderedWidth
        : align === "center"
          ? x + (width - renderedWidth) / 2
          : x
    for (const run of runs) {
      doc
        .font(fontFor(run))
        .fontSize(fontSize)
        .fillColor(options.color ?? INK)
        .text(run.value, cursor, y, { lineBreak: false })
      cursor += doc.widthOfString(run.value)
    }
    return
  }

  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.size ?? 10)
    .fillColor(options.color ?? INK)
    .text(value, x, y, {
      width,
      align: options.align ?? "left",
      lineGap: 2,
    })
}

function field(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  text(doc, label.toUpperCase(), x, y, width, { size: 7.5, color: MUTED })
  text(doc, value, x, y + 15, width, { size: 10.5, bold: true })
}

/**
 * Produces the receipt without React-PDF's stateful TextKit layer. Every
 * document owns its PDFKit instance, which keeps Arabic/Latin rendering
 * isolated even when consecutive requests use different scripts.
 */
export function renderInvoiceReceipt(data: PaymentReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: MARGIN })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.registerFont("Arabic", arabicFont)
    doc.registerFont("ArabicBold", arabicBoldFont)

    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill("#FFFFFF")
    doc.rect(0, 0, PAGE_WIDTH, 9).fill(PRIMARY)
    doc.image(logo, MARGIN, 36, { fit: [112, 62] })

    text(doc, "INVOICE / RECEIPT", MARGIN, 44, CONTENT_WIDTH, {
      size: 21,
      bold: true,
      color: PRIMARY,
      align: "right",
    })
    text(doc, `No. ${data.reference}`, MARGIN, 74, CONTENT_WIDTH, { size: 9, color: MUTED, align: "right" })
    text(doc, `Issued ${formatDate(data.createdAt)}`, MARGIN, 89, CONTENT_WIDTH, { size: 9, color: MUTED, align: "right" })

    doc.moveTo(MARGIN, 122).lineTo(PAGE_WIDTH - MARGIN, 122).lineWidth(1).strokeColor(BORDER).stroke()

    const columnGap = 28
    const columnWidth = (CONTENT_WIDTH - columnGap) / 2
    field(doc, "Billed to", data.payerName, MARGIN, 146, columnWidth)
    field(doc, "Email", data.payerEmail, MARGIN, 194, columnWidth)
    if (data.doctorName) field(doc, "Doctor", data.doctorName, MARGIN + columnWidth + columnGap, 146, columnWidth)
    if (data.centerName) field(doc, "Center", data.centerName, MARGIN + columnWidth + columnGap, 194, columnWidth)
    if (data.appointmentReference) {
      field(doc, "Appointment reference", data.appointmentReference, MARGIN + columnWidth + columnGap, 242, columnWidth)
    } else if (data.caseReference) {
      field(doc, "Case reference", data.caseReference, MARGIN + columnWidth + columnGap, 242, columnWidth)
    }

    const tableTop = 294
    const serviceLabel =
      (data.serviceNameEn
        ? data.serviceNameEn + (data.serviceNameAr ? ` / ${data.serviceNameAr}` : "")
        : null) ??
      (data.appointmentType ? APPOINTMENT_TYPE_LABEL[data.appointmentType] : null) ??
      PURPOSE_LABEL[data.purpose] ??
      data.purpose
    doc.roundedRect(MARGIN, tableTop, CONTENT_WIDTH, 102, 10).fillAndStroke(SURFACE, BORDER)
    text(doc, "DESCRIPTION", MARGIN + 16, tableTop + 14, CONTENT_WIDTH - 160, { size: 7.5, color: MUTED })
    text(doc, "AMOUNT", PAGE_WIDTH - MARGIN - 145, tableTop + 14, 128, { size: 7.5, color: MUTED, align: "right" })
    doc.moveTo(MARGIN + 16, tableTop + 34).lineTo(PAGE_WIDTH - MARGIN - 16, tableTop + 34).lineWidth(1).strokeColor(BORDER).stroke()
    text(doc, serviceLabel, MARGIN + 16, tableTop + 54, CONTENT_WIDTH - 160, { size: 10.5, bold: true })
    text(doc, formatMoney(data.amount, data.currency), PAGE_WIDTH - MARGIN - 145, tableTop + 54, 128, {
      size: 10.5,
      bold: true,
      align: "right",
    })

    const isRefunded = Boolean(data.refundedAmount && Number(data.refundedAmount) > 0)
    const refundAmt = isRefunded ? Number(data.refundedAmount) : 0
    const netAmount = Math.max(0, Number(data.amount) - refundAmt).toFixed(2)

    const totalsTop = 416
    const totalsWidth = 248
    const totalsX = PAGE_WIDTH - MARGIN - totalsWidth
    text(doc, "Payment method", totalsX, totalsTop, 112, { size: 9, color: MUTED })
    text(doc, PROVIDER_LABEL[data.provider] ?? data.provider, totalsX + 112, totalsTop, 136, { size: 9, align: "right" })
    text(doc, "Payment date", totalsX, totalsTop + 20, 112, { size: 9, color: MUTED })
    text(doc, formatDate(data.paidAt), totalsX + 112, totalsTop + 20, 136, { size: 9, align: "right" })

    if (isRefunded) {
      text(doc, "Original gross", totalsX, totalsTop + 40, 112, { size: 9, color: MUTED })
      text(doc, formatMoney(data.amount, data.currency), totalsX + 112, totalsTop + 40, 136, { size: 9, align: "right" })
      text(doc, `Refund (${data.creditNoteNumber ?? "Credit Note"})`, totalsX, totalsTop + 58, 140, { size: 8, color: "#B91C1C" })
      text(doc, `-${formatMoney(data.refundedAmount!, data.currency)}`, totalsX + 112, totalsTop + 58, 136, { size: 8.5, color: "#B91C1C", align: "right" })

      doc.moveTo(totalsX, totalsTop + 78).lineTo(totalsX + totalsWidth, totalsTop + 78).lineWidth(1).strokeColor(BORDER).stroke()
      text(doc, "NET PAID", totalsX, totalsTop + 88, 112, { size: 12, bold: true })
      text(doc, formatMoney(netAmount, data.currency), totalsX + 102, totalsTop + 86, 146, {
        size: 13,
        bold: true,
        color: PRIMARY,
        align: "right",
      })
    } else {
      doc.moveTo(totalsX, totalsTop + 48).lineTo(totalsX + totalsWidth, totalsTop + 48).lineWidth(1).strokeColor(BORDER).stroke()
      text(doc, "TOTAL", totalsX, totalsTop + 60, 112, { size: 12, bold: true })
      text(doc, formatMoney(data.amount, data.currency), totalsX + 102, totalsTop + 58, 146, {
        size: 13,
        bold: true,
        color: PRIMARY,
        align: "right",
      })
    }

    const statusColor =
      data.status === "PAID"
        ? "#1E7B34"
        : data.status === "PARTIALLY_REFUNDED"
          ? "#B45309"
          : data.status === "REFUNDED"
            ? "#B91C1C"
            : "#A15C00"
    const statusBackground =
      data.status === "PAID"
        ? "#E6F4EA"
        : data.status === "PARTIALLY_REFUNDED"
          ? "#FEF3C7"
          : data.status === "REFUNDED"
            ? "#FEE2E2"
            : "#FDF1E4"
    const pillTop = isRefunded ? 550 : 522
    doc.roundedRect(MARGIN, pillTop, 130, 24, 12).fill(statusBackground)
    text(doc, data.status.replace(/_/g, " ").toUpperCase(), MARGIN, pillTop + 7, 130, { size: 8, bold: true, color: statusColor, align: "center" })

    doc.moveTo(MARGIN, PAGE_HEIGHT - 86).lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 86).lineWidth(1).strokeColor(BORDER).stroke()
    text(
      doc,
      "Med Aura payment receipt. This document contains no clinical or diagnostic information.",
      MARGIN,
      PAGE_HEIGHT - 70,
      CONTENT_WIDTH,
      { size: 8, color: MUTED },
    )
    text(doc, `Reference: ${data.reference}`, MARGIN, PAGE_HEIGHT - 54, CONTENT_WIDTH, { size: 8, color: MUTED })
    if (data.creditNoteNumber) {
      text(
        doc,
        `Credit Note: ${data.creditNoteNumber} (issued ${formatDate(data.refundedAt ?? null)})`,
        MARGIN,
        PAGE_HEIGHT - 40,
        CONTENT_WIDTH,
        { size: 8, color: MUTED },
      )
    }

    doc.end()
  })
}