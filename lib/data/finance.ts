import { desc, eq, inArray, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  payment,
  paymentWebhookEvent,
  invoice,
  refundRequest,
  creditNote,
  aestheticCase,
  procedure as procedureT,
  user as userT,
} from "@/lib/db/schema"
import type { MoneyTotal } from "@/lib/money"

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

export async function listPendingPayments(limit = 20): Promise<FinancePaymentRow[]> {
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
    .where(inArray(payment.status, ["CREATED", "PENDING", "REQUIRES_ACTION"]))
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
  platformCommissionRate: string
  platformCommissionAmount: string
  providerNetAmount: string
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
      platformCommissionRate: invoice.platformCommissionRate,
      platformCommissionAmount: invoice.platformCommissionAmount,
      providerNetAmount: invoice.providerNetAmount,
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
  creditNoteNumber: string | null
  paymentId: string | null
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
      creditNoteNumber: creditNote.creditNoteNumber,
      paymentId: refundRequest.paymentId,
      createdAt: refundRequest.createdAt,
    })
    .from(refundRequest)
    .innerJoin(userT, eq(refundRequest.requestedByUserId, userT.id))
    .innerJoin(invoice, eq(refundRequest.invoiceId, invoice.id))
    .leftJoin(creditNote, eq(refundRequest.creditNoteId, creditNote.id))
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

/**
 * Every money figure is a per-currency breakdown, never a single number:
 * payments and invoices each carry their own currency and the platform has no
 * FX rates, so adding them together would report revenue that was never
 * collected. See lib/money.ts.
 */
export type FinanceSummary = {
  collected: MoneyTotal[]
  invoiced: MoneyTotal[]
  outstanding: MoneyTotal[]
  platformCommission: MoneyTotal[]
  providerNet: MoneyTotal[]
  refunded: MoneyTotal[]
  disputedCount: number
}
export async function getFinanceSummary(): Promise<FinanceSummary> {
  const empty: FinanceSummary = { collected: [], invoiced: [], outstanding: [], platformCommission: [], providerNet: [], refunded: [], disputedCount: 0 }
  if (!isDbConfigured) return empty

  const [collected, invoiced, refunded, disputed] = await Promise.all([
    db
      .select({ currency: payment.currency, sum: sql<string>`coalesce(sum(${payment.amount}), 0)` })
      .from(payment)
      .where(eq(payment.status, "PAID"))
      .groupBy(payment.currency),
    db
      .select({
        currency: invoice.currency,
        total: sql<string>`coalesce(sum(${invoice.total}), 0)`,
        remaining: sql<string>`coalesce(sum(${invoice.remainingAmount}), 0)`,
        commission: sql<string>`coalesce(sum(${invoice.platformCommissionAmount}), 0)`,
        providerNet: sql<string>`coalesce(sum(${invoice.providerNetAmount}), 0)`,
      })
      .from(invoice)
      .groupBy(invoice.currency),
    // refund_request has no currency of its own — it refunds an invoice, so
    // the invoice's currency is the authoritative one.
    db
      .select({ currency: invoice.currency, sum: sql<string>`coalesce(sum(${refundRequest.amount}), 0)` })
      .from(refundRequest)
      .innerJoin(invoice, eq(refundRequest.invoiceId, invoice.id))
      .where(eq(refundRequest.status, "PROCESSED"))
      .groupBy(invoice.currency),
    db.select({ n: sql<string>`count(*)` }).from(payment).where(eq(payment.status, "DISPUTED")),
  ])

  return {
    collected: collected.map((r) => ({ currency: r.currency, amount: Number(r.sum) })),
    invoiced: invoiced.map((r) => ({ currency: r.currency, amount: Number(r.total) })),
    outstanding: invoiced.map((r) => ({ currency: r.currency, amount: Number(r.remaining) })),
    platformCommission: invoiced.map((r) => ({ currency: r.currency, amount: Number(r.commission) })),
    providerNet: invoiced.map((r) => ({ currency: r.currency, amount: Number(r.providerNet) })),
    refunded: refunded.map((r) => ({ currency: r.currency, amount: Number(r.sum) })),
    disputedCount: Number(disputed[0]?.n ?? 0),
  }
}
