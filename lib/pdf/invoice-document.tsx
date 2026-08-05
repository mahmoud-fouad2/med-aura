import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer"
import path from "node:path"
import type { PaymentReceiptData } from "@/lib/data/invoice"

const BRAND_PRIMARY = "#4A1D96"
const INK = "#1F1B24"
const MUTED = "#6B6470"
const BORDER = "#E4DEEC"

// Names (doctor/center/payer) can be Arabic — Helvetica (the base-14 PDF font
// used everywhere else in this document) has no Arabic glyphs at all, which
// rendered as corrupted/missing characters. Registered separately from
// Helvetica and only applied to the Arabic-script runs within a value (see
// splitByScript/NameValue below), not the whole document.
//
// Must be .woff, not .woff2: @react-pdf's pdfkit/fontkit subsetter corrupts
// its internal glyph-id state across repeated renders of the same
// registered .woff2 font in one process (every render after the first ~2
// throws "Offset is outside the bounds of the DataView" from
// fontkit's TTFSubset) — reproduced locally, verified .woff does not
// regress across 15+ repeated renders. This process serves many requests,
// so that would have broken after the first couple of real invoices.
//
// Copied into public/fonts/pdf/ rather than read from node_modules: this
// path is a runtime path.join(process.cwd(), ...), not a static import, so
// Next's output:"standalone" file-tracing can't see it as a dependency and
// never copies it into the deployed build — scripts/prepare-standalone.mjs
// only knows to hand-copy public/, .next/static/, and drizzle/ for exactly
// this reason. Confirmed live: this crashed every real invoice whose
// doctor/center name is Arabic with an uncaught ENOENT-class error (500),
// silent in dev where the full node_modules tree is always present.
const alexandriaFontsDir = path.join(process.cwd(), "public/fonts/pdf")
Font.register({
  family: "Alexandria",
  fonts: [
    { src: path.join(alexandriaFontsDir, "alexandria-arabic-400-normal.woff"), fontWeight: 400 },
    { src: path.join(alexandriaFontsDir, "alexandria-arabic-700-normal.woff"), fontWeight: 700 },
  ],
})

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

/** Splits text into runs so each character-class (Arabic-script vs. everything
 * else) can be given the font that actually has glyphs for it — e.g. "د. Ahmed"
 * needs the Arabic font for "د" and Helvetica for ". Ahmed" (the Arabic font's
 * subset doesn't cover Latin/digits/punctuation, only its own script). */
function splitByScript(text: string): { text: string; arabic: boolean }[] {
  const parts: { text: string; arabic: boolean }[] = []
  for (const ch of text) {
    const isArabic = ARABIC_RE.test(ch)
    const last = parts[parts.length - 1]
    if (last && last.arabic === isArabic) last.text += ch
    else parts.push({ text: ch, arabic: isArabic })
  }
  return parts
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 100, height: 75, objectFit: "contain" },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND_PRIMARY, textAlign: "right" },
  docMeta: { fontSize: 9, color: MUTED, textAlign: "right", marginTop: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 18 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 24 },
  colBlock: { flex: 1 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 10 },
  valueArabic: { fontFamily: "Alexandria", fontWeight: 700 },
  table: { marginTop: 24, borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F5F2FA",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 10 },
  colService: { flex: 3 },
  colAmount: { flex: 1, textAlign: "right" },
  th: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  totalsBlock: { marginTop: 4, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 4 },
  totalLabel: { fontSize: 10, color: MUTED },
  totalValue: { fontSize: 10, color: INK },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK },
  grandTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BRAND_PRIMARY },
  statusPill: {
    marginTop: 24,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },
  footerText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
})

function NameValue({ value }: { value: string }) {
  return (
    <Text style={styles.value}>
      {splitByScript(value).map((part, i) => (
        <Text key={i} style={part.arabic ? styles.valueArabic : undefined}>
          {part.text}
        </Text>
      ))}
    </Text>
  )
}

const STATUS_LABEL: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  CREATED: "Created",
  REQUIRES_ACTION: "Requires Action",
  AUTHORIZED: "Authorized",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  PARTIALLY_REFUNDED: "Partially Refunded",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
}
const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "#E6F4EA", fg: "#1E7B34" },
  REFUNDED: { bg: "#F1EEF7", fg: "#5B4B7A" },
  PARTIALLY_REFUNDED: { bg: "#F1EEF7", fg: "#5B4B7A" },
}
const DEFAULT_STATUS_COLOR = { bg: "#FDF1E4", fg: "#A15C00" }

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
  test: "Test Payment (QA)",
}

function fmtDate(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtAmount(amount: string, currency: string): string {
  return `${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

/**
 * Branded English-first receipt/invoice PDF for a single payment. Never
 * includes clinical data — only what a payer needs for their records
 * (who, what service, how much, when, how it was paid).
 */
export function InvoiceDocument({ data }: { data: PaymentReceiptData }) {
  const statusLabel = STATUS_LABEL[data.status] ?? data.status
  const statusColor = STATUS_COLOR[data.status] ?? DEFAULT_STATUS_COLOR
  const serviceLabel =
    data.serviceNameEn ??
    (data.appointmentType ? APPOINTMENT_TYPE_LABEL[data.appointmentType] : null) ??
    (PURPOSE_LABEL[data.purpose] ?? data.purpose)
  const logoPath = path.join(process.cwd(), "public", "brand", "med-aura-logo.png")

  return (
    <Document title={`Med Aura Invoice ${data.reference}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Image src={logoPath} style={styles.logo} />
          <View>
            <Text style={styles.docTitle}>INVOICE / RECEIPT</Text>
            <Text style={styles.docMeta}>No. {data.reference}</Text>
            <Text style={styles.docMeta}>Issued {fmtDate(data.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.colBlock}>
            <Text style={styles.label}>Billed To</Text>
            <NameValue value={data.payerName} />
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.payerEmail}</Text>
          </View>
          <View style={styles.colBlock}>
            {data.doctorName ? (
              <>
                <Text style={styles.label}>Doctor</Text>
                <NameValue value={data.doctorName} />
              </>
            ) : null}
            {data.centerName ? (
              <>
                <Text style={styles.label}>Center</Text>
                <NameValue value={data.centerName} />
              </>
            ) : null}
            {data.appointmentReference ? (
              <>
                <Text style={styles.label}>Appointment Reference</Text>
                <Text style={styles.value}>{data.appointmentReference}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colService]}>Description</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colService}>{serviceLabel}</Text>
            <Text style={styles.colAmount}>{fmtAmount(data.amount, data.currency)}</Text>
          </View>
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Payment Method</Text>
            <Text style={styles.totalValue}>{PROVIDER_LABEL[data.provider] ?? data.provider}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Payment Date</Text>
            <Text style={styles.totalValue}>{fmtDate(data.paidAt)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmtAmount(data.amount, data.currency)}</Text>
          </View>
        </View>

        <Text style={[styles.statusPill, { backgroundColor: statusColor.bg, color: statusColor.fg }]}>
          {statusLabel.toUpperCase()}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Med Aura — this document is a payment receipt, not a medical record. It contains no
            clinical or diagnostic information. For questions about this payment, contact Med Aura
            support with the reference number above.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
