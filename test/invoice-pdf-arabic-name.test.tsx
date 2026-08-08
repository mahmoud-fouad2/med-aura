import { describe, it, expect } from "vitest"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoiceDocument } from "@/lib/pdf/invoice-document"
import type { PaymentReceiptData } from "@/lib/data/invoice"

/**
 * Receipt PDF rendering, and the known upstream failure behind the
 * "تعذر تحميل الإيصال" report from the native Billing screen.
 *
 * The document itself is fine: an Arabic payer name and a Latin payer name
 * each render to a valid PDF, which is what the two tests below assert.
 *
 * What breaks is @react-pdf's cross-render state. Rendering a receipt whose
 * payer name is Latin-only, then one whose payer name is Arabic, throws
 * `TypeError: Cannot read properties of undefined (reading 'id')` from
 * @react-pdf/textkit's reorderLine (its bidi pass). Reproduced repeatedly
 * against two real production rows — PAY-A08577D2 (payer "Gomana amr
 * alsheemy") followed by PAY-24697CED (payer "علي محمد") — while either row
 * on its own rendered four times in a row without complaint. It is the same
 * family of bug as the .woff2 subsetter corruption already documented at the
 * top of lib/pdf/invoice-document.tsx: shared mutable state in the library
 * that survives between renders in one process.
 *
 * Ruled out by experiment, so nobody spends the afternoon re-trying them:
 *   - Font.reset() between renders (breaks font loading outright)
 *   - re-registering the family before each render (no effect)
 *   - Font.clear() + re-register (also unregisters the base-14 fonts)
 *   - retrying the failed render (fails identically)
 *   - an Arabic-name warm-up render at boot (helps some strings, not all)
 *   - a fresh style object per run instead of the shared StyleSheet entry
 *   - a constant flexDirection style shape across the LTR/RTL branches
 *   - always emitting an Arabic-font run in the name row
 * Which sequences throw also depends on the set of strings rendered earlier
 * in the process, so a deterministic assertion of the failure is not possible
 * here — that is why this file documents it rather than testing for it.
 *
 * Until it is fixed upstream, the route catches the throw, logs the cause,
 * and returns a plain-text 500; the native client checks the content type and
 * deletes the file rather than leaving an HTML error page saved as a ".pdf".
 */

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
  renderToBuffer(<InvoiceDocument data={{ ...BASE, payerName }} />)

/** A real PDF starts with the %PDF- header; an HTML error page does not. */
const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-"

describe("invoice receipt PDF", () => {
  it("renders a receipt with an Arabic payer name", async () => {
    const buf = await render("علي محمد")
    expect(isPdf(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(1000)
  }, 60_000)

  it("renders a receipt with a Latin payer name", async () => {
    const buf = await render("Ali Mohamed")
    expect(isPdf(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(1000)
  }, 60_000)
})
