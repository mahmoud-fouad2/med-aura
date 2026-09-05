import { describe, it, expect, afterAll } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  doctorProfile,
  center,
  procedure,
  aestheticCase,
  invoice,
  payment,
  refundRequest,
  creditNote,
} from "@/lib/db/schema"
import { getPaymentReceiptData } from "@/lib/data/invoice"
import { renderInvoiceReceipt } from "@/lib/pdf/invoice-receipt-renderer"
import { getInvoiceForCase } from "@/lib/data/care"
import { listRefundRequestsFinance } from "@/lib/data/finance"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Financial Invoicing, Receipt PDF & Credit Note Transparency (Finding 13)", { timeout: 30000 }, () => {
  const patientUserId = rid()
  const doctorUserId = rid()
  const centerOwnerUserId = rid()
  let doctorId = ""
  let centerId = ""
  let procedureId = ""
  let caseId = ""
  let invoiceId = ""
  let paymentId = ""
  let refundId = ""
  let creditNoteId = ""

  afterAll(async () => {
    if (refundId) {
      await db.delete(refundRequest).where(eq(refundRequest.id, refundId))
    }
    if (creditNoteId) {
      await db.delete(creditNote).where(eq(creditNote.id, creditNoteId))
    }
    if (paymentId) {
      await db.delete(payment).where(eq(payment.id, paymentId))
    }
    if (invoiceId) {
      await db.delete(invoice).where(eq(invoice.id, invoiceId))
    }
    if (caseId) {
      await db.delete(aestheticCase).where(eq(aestheticCase.id, caseId))
    }
    if (doctorId) {
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    if (centerId) {
      await db.delete(center).where(eq(center.id, centerId))
    }
    await db.delete(user).where(inArray(user.id, [patientUserId, doctorUserId, centerOwnerUserId]))
    await pool.end()
  })

  it("resolves doctor, center, and procedure on case deposit receipts when appointmentId is null", async () => {
    // 1. Seed patient, doctor, center, procedure
    await db.insert(user).values({ id: patientUserId, name: "Nour Al-Sabah", email: `nour-${patientUserId}@t.local`, role: "patient" })
    await db.insert(user).values({ id: doctorUserId, name: "Dr. Khaled Al-Mansoor", email: `khaled-${doctorUserId}@t.local`, role: "doctor" })
    await db.insert(user).values({ id: centerOwnerUserId, name: "Center Owner", email: `owner-${centerOwnerUserId}@t.local`, role: "center_owner" })

    const proc = (await db.select({ id: procedure.id }).from(procedure).limit(1))[0]
    expect(proc).toBeDefined()
    procedureId = proc.id

    const [cen] = await db
      .insert(center)
      .values({
        ownerId: centerOwnerUserId,
        legalName: "Elite Aesthetic Medical Center LLC",
        name: "مركز إليت الطبي التجميلي",
        slug: `elite-center-${centerOwnerUserId.slice(0, 8)}`,
        country: "SA",
        city: "Riyadh",
        verified: true,
        published: true,
        status: "approved",
      })
      .returning({ id: center.id })
    centerId = cen.id

    const [doc] = await db
      .insert(doctorProfile)
      .values({
        userId: doctorUserId,
        name: "د. خالد المنصور",
        slug: `dr-khaled-${doctorUserId.slice(0, 8)}`,
        centerId,
        country: "SA",
        city: "Riyadh",
        status: "approved",
        published: true,
        consultationFee: "350.00",
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc.id

    const [acCase] = await db
      .insert(aestheticCase)
      .values({
        reference: `CASE-${rid().slice(0, 8).toUpperCase()}`,
        patientUserId,
        doctorId,
        centerId,
        procedureId,
        status: "DEPOSIT_PAID",
        goal: "Procedure case test",
        createdBy: patientUserId,
      })
      .returning({ id: aestheticCase.id, reference: aestheticCase.reference })
    caseId = acCase.id

    // 2. Insert case deposit payment (no appointmentId)
    const [pay] = await db
      .insert(payment)
      .values({
        reference: `PAY-${rid().slice(0, 8).toUpperCase()}`,
        payerUserId: patientUserId,
        caseId,
        appointmentId: null,
        purpose: "DEPOSIT",
        status: "PAID",
        amount: "2500.00",
        currency: "SAR",
        provider: "stripe",
        paidAt: new Date(),
      })
      .returning({ id: payment.id, reference: payment.reference })
    paymentId = pay.id

    // 3. Query receipt data
    const receiptData = await getPaymentReceiptData(paymentId)
    expect(receiptData).not.toBeNull()
    expect(receiptData!.paymentId).toBe(paymentId)
    expect(receiptData!.caseReference).toBe(acCase.reference)
    expect(receiptData!.appointmentReference).toBeNull()
    expect(receiptData!.doctorName).toBe("د. خالد المنصور")
    expect(receiptData!.centerName).toBe("مركز إليت الطبي التجميلي")
    expect(receiptData!.serviceNameEn).toBeDefined()
    expect(receiptData!.amount).toBe("2500.00")
    expect(receiptData!.currency).toBe("SAR")

    // 4. Render PDF receipt for deposit
    const pdfBuf = await renderInvoiceReceipt(receiptData!)
    expect(pdfBuf.subarray(0, 5).toString("latin1")).toBe("%PDF-")
    expect(pdfBuf.length).toBeGreaterThan(1000)
  })

  it("persists invoice receipt download access when payment is partially refunded or refunded", async () => {
    // 1. Create invoice for the case
    const [inv] = await db
      .insert(invoice)
      .values({
        invoiceNumber: `INV-${rid().slice(0, 8).toUpperCase()}`,
        caseId,
        patientUserId,
        total: "10000.00",
        paidAmount: "2500.00",
        remainingAmount: "7500.00",
        status: "PARTIALLY_PAID",
        currency: "SAR",
      })
      .returning({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })
    invoiceId = inv.id

    // 2. Before refund: getInvoiceForCase returns latestPaymentId
    const invoiceBefore = await getInvoiceForCase(caseId)
    expect(invoiceBefore).not.toBeNull()
    expect(invoiceBefore!.latestPaymentId).toBe(paymentId)

    // 3. Issue credit note and process refund
    const [cn] = await db
      .insert(creditNote)
      .values({
        creditNoteNumber: `CN-${rid().slice(0, 8).toUpperCase()}`,
        invoiceId,
        amount: "1000.00",
        reason: "Patient schedule adjustment",
        createdBy: doctorUserId,
      })
      .returning({ id: creditNote.id, creditNoteNumber: creditNote.creditNoteNumber })
    creditNoteId = cn.id

    const [refReq] = await db
      .insert(refundRequest)
      .values({
        invoiceId,
        paymentId,
        caseId,
        requestedByUserId: patientUserId,
        amount: "1000.00",
        reason: "Patient schedule adjustment",
        status: "PROCESSED",
        creditNoteId,
        processedAt: new Date(),
      })
      .returning({ id: refundRequest.id })
    refundId = refReq.id

    // Update payment to PARTIALLY_REFUNDED
    await db
      .update(payment)
      .set({ status: "PARTIALLY_REFUNDED" })
      .where(eq(payment.id, paymentId))

    // Update invoice
    await db
      .update(invoice)
      .set({ paidAmount: "1500.00", remainingAmount: "8500.00", status: "PARTIALLY_REFUNDED" })
      .where(eq(invoice.id, invoiceId))

    // 4. After refund: getInvoiceForCase must STILL return latestPaymentId so user can download receipt
    const invoiceAfter = await getInvoiceForCase(caseId)
    expect(invoiceAfter).not.toBeNull()
    expect(invoiceAfter!.latestPaymentId).toBe(paymentId)

    // 5. Query receipt data and verify credit note and refund details are captured
    const refundedReceipt = await getPaymentReceiptData(paymentId)
    expect(refundedReceipt).not.toBeNull()
    expect(refundedReceipt!.status).toBe("PARTIALLY_REFUNDED")
    expect(refundedReceipt!.refundedAmount).toBe("1000.00")
    expect(refundedReceipt!.creditNoteNumber).toBe(cn.creditNoteNumber)
    expect(refundedReceipt!.refundedAt).toBeInstanceOf(Date)

    // 6. Render PDF with refund details
    const refundedPdf = await renderInvoiceReceipt(refundedReceipt!)
    expect(refundedPdf.subarray(0, 5).toString("latin1")).toBe("%PDF-")
    expect(refundedPdf.length).toBeGreaterThan(1000)

    // 7. Verify listRefundRequestsFinance exposes credit note and paymentId to finance
    const financeRefunds = await listRefundRequestsFinance(20)
    const matched = financeRefunds.find((r) => r.id === refundId)
    expect(matched).toBeDefined()
    expect(matched!.creditNoteNumber).toBe(cn.creditNoteNumber)
    expect(matched!.paymentId).toBe(paymentId)
    expect(matched!.amount).toBe("1000.00")
  })
})
