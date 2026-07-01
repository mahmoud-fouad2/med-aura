import { desc, eq, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  payment,
  paymentWebhookEvent,
  invoice,
  refundRequest,
  aestheticCase,
  procedure as procedureT,
  user as userT,
} from "@/lib/db/schema"

/**
 * Finance-scoped queries. Deliberately select ONLY billing fields — never
 * medicalDocument, consultationOutcome, treatmentPlan, symptomReport, or
 * message content. Case reference/procedure name are billing labels, not
 * clinical data.
 */

export type FinancePaymentRow = {
  id: string
  reference: string
  purpose: string
  status: string
  amount: string
  currency: string
  provider: string
  payerName: string
  caseReference: string | null
  procedureName: string | null
  createdAt: Date
  paidAt: Date | null
}
export async function listPayments(limit = 60): Promise<FinancePaymentRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: payment.id,
      reference: payment.reference,
      purpose: payment.purpose,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      payerName: userT.name,
      caseReference: aestheticCase.reference,
      procedureName: procedureT.nameAr,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
    })
    .from(payment)
    .innerJoin(userT, eq(payment.payerUserId, userT.id))
    .leftJoin(aestheticCase, eq(payment.caseId, aestheticCase.id))
    .leftJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .orderBy(desc(payment.createdAt))
    .limit(limit)
}

export type FinanceInvoiceRow = {
  id: string
  invoiceNumber: string
  status: string
  total: string
  paidAmount: string
  remainingAmount: string
  currency: string
  patientName: string
  caseId: string | null
  createdAt: Date
}
export async function listInvoicesFinance(limit = 60): Promise<FinanceInvoiceRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      currency: invoice.currency,
      patientName: userT.name,
      caseId: invoice.caseId,
      createdAt: invoice.createdAt,
    })
    .from(invoice)
    .innerJoin(userT, eq(invoice.patientUserId, userT.id))
    .orderBy(desc(invoice.createdAt))
    .limit(limit)
}

export type FinanceRefundRow = {
  id: string
  amount: string
  reason: string
  status: string
  requestedByName: string
  caseId: string
  invoiceNumber: string
  currency: string
  createdAt: Date
}
export async function listRefundRequestsFinance(limit = 60): Promise<FinanceRefundRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: refundRequest.id,
      amount: refundRequest.amount,
      reason: refundRequest.reason,
      status: refundRequest.status,
      requestedByName: userT.name,
      caseId: refundRequest.caseId,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      createdAt: refundRequest.createdAt,
    })
    .from(refundRequest)
    .innerJoin(userT, eq(refundRequest.requestedByUserId, userT.id))
    .innerJoin(invoice, eq(refundRequest.invoiceId, invoice.id))
    .orderBy(desc(refundRequest.createdAt))
    .limit(limit)
}

export type FinanceWebhookRow = {
  id: string
  provider: string
  eventId: string
  type: string
  processedAt: Date | null
  error: string | null
  createdAt: Date
}
export async function listWebhookEvents(limit = 40): Promise<FinanceWebhookRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: paymentWebhookEvent.id,
      provider: paymentWebhookEvent.provider,
      eventId: paymentWebhookEvent.eventId,
      type: paymentWebhookEvent.type,
      processedAt: paymentWebhookEvent.processedAt,
      error: paymentWebhookEvent.error,
      createdAt: paymentWebhookEvent.createdAt,
    })
    .from(paymentWebhookEvent)
    .orderBy(desc(paymentWebhookEvent.createdAt))
    .limit(limit)
}

export type FinanceSummary = {
  totalCollected: number
  totalInvoiced: number
  totalOutstanding: number
  totalRefunded: number
  disputedCount: number
  currency: string
}
export async function getFinanceSummary(): Promise<FinanceSummary> {
  const empty: FinanceSummary = { totalCollected: 0, totalInvoiced: 0, totalOutstanding: 0, totalRefunded: 0, disputedCount: 0, currency: "SAR" }
  if (!isDbConfigured) return empty

  const [collected, invoiced, outstanding, refunded, disputed] = await Promise.all([
    db.select({ sum: sql<string>`coalesce(sum(${payment.amount}), 0)` }).from(payment).where(eq(payment.status, "PAID")),
    db.select({ sum: sql<string>`coalesce(sum(${invoice.total}), 0)` }).from(invoice),
    db.select({ sum: sql<string>`coalesce(sum(${invoice.remainingAmount}), 0)` }).from(invoice),
    db.select({ sum: sql<string>`coalesce(sum(${refundRequest.amount}), 0)` }).from(refundRequest).where(eq(refundRequest.status, "PROCESSED")),
    db.select({ n: sql<string>`count(*)` }).from(payment).where(eq(payment.status, "DISPUTED")),
  ])

  return {
    totalCollected: Number(collected[0]?.sum ?? 0),
    totalInvoiced: Number(invoiced[0]?.sum ?? 0),
    totalOutstanding: Number(outstanding[0]?.sum ?? 0),
    totalRefunded: Number(refunded[0]?.sum ?? 0),
    disputedCount: Number(disputed[0]?.n ?? 0),
    currency: "SAR",
  }
}
