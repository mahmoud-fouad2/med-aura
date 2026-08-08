import fs from "node:fs"
import path from "node:path"
// @ts-expect-error @react-pdf/pdfkit is a transitive runtime dependency without declarations.
import PDFDocument from "@react-pdf/pdfkit"
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

const assetsRoot = path.join(process.cwd(), "public")
const arabicFont = path.join(assetsRoot, "fonts", "pdf", "alexandria-arabic-400-normal.woff")
const arabicBoldFont = path.join(assetsRoot, "fonts", "pdf", "alexandria-arabic-700-normal.woff")
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

function hasArabic(value: string): boolean {
  return ARABIC_RE.test(value)
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
  doc
    .font(arabic ? (options.bold ? "ArabicBold" : "Arabic") : options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.size ?? 10)
    .fillColor(options.color ?? INK)
    .text(value, x, y, {
      width,
      align: options.align ?? (arabic ? "right" : "left"),
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
    }

    const tableTop = 294
    const serviceLabel =
      data.serviceNameEn ??
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

    const totalsTop = 426
    const totalsWidth = 232
    const totalsX = PAGE_WIDTH - MARGIN - totalsWidth
    text(doc, "Payment method", totalsX, totalsTop, 112, { size: 9, color: MUTED })
    text(doc, PROVIDER_LABEL[data.provider] ?? data.provider, totalsX + 112, totalsTop, 120, { size: 9, align: "right" })
    text(doc, "Payment date", totalsX, totalsTop + 24, 112, { size: 9, color: MUTED })
    text(doc, formatDate(data.paidAt), totalsX + 112, totalsTop + 24, 120, { size: 9, align: "right" })
    doc.moveTo(totalsX, totalsTop + 50).lineTo(totalsX + totalsWidth, totalsTop + 50).lineWidth(1).strokeColor(BORDER).stroke()
    text(doc, "TOTAL", totalsX, totalsTop + 63, 112, { size: 12, bold: true })
    text(doc, formatMoney(data.amount, data.currency), totalsX + 102, totalsTop + 60, 130, {
      size: 13,
      bold: true,
      color: PRIMARY,
      align: "right",
    })

    const statusColor = data.status === "PAID" ? "#1E7B34" : "#A15C00"
    const statusBackground = data.status === "PAID" ? "#E6F4EA" : "#FDF1E4"
    doc.roundedRect(MARGIN, 522, 92, 24, 12).fill(statusBackground)
    text(doc, data.status.toUpperCase(), MARGIN, 529, 92, { size: 8, bold: true, color: statusColor, align: "center" })

    doc.moveTo(MARGIN, PAGE_HEIGHT - 78).lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 78).lineWidth(1).strokeColor(BORDER).stroke()
    text(
      doc,
      "Med Aura payment receipt. This document contains no clinical or diagnostic information.",
      MARGIN,
      PAGE_HEIGHT - 62,
      CONTENT_WIDTH,
      { size: 8, color: MUTED },
    )
    text(doc, `Reference: ${data.reference}`, MARGIN, PAGE_HEIGHT - 43, CONTENT_WIDTH, { size: 8, color: MUTED })

    doc.end()
  })
}