import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { invoice, aestheticCase, user as userT } from "@/lib/db/schema"
import type { MoneyTotal } from "@/lib/money"

/**
 * A provider's own view of what the platform owes them — the same
 * platformCommissionAmount/providerNetAmount every invoice already carries
 * (lib/data/finance.ts computes the identical figures for the admin finance
 * page), just scoped to one doctor/center instead of the whole platform.
 *
 * "Collected" sums invoices already fully PAID; "pending" sums invoices
 * still owed (issued/partially paid/overdue) — never a proportional split
 * of a partial payment, which would just be a guess dressed up as a number.
 */

const COLLECTED_STATUSES = ["PAID"] as const
const PENDING_STATUSES = ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] as const

export type EarningsInvoiceRow = {
  id: string
  invoiceNumber: string
  status: string
  currency: string
  total: string
  platformCommissionAmount: string
  providerNetAmount: string
  patientName: string
  createdAt: Date
}

export type EarningsSummary = {
  collected: MoneyTotal[]
  pending: MoneyTotal[]
  invoiceCount: number
  recent: EarningsInvoiceRow[]
}

const EMPTY: EarningsSummary = { collected: [], pending: [], invoiceCount: 0, recent: [] }

async function netByStatus(
  scope: SQL,
  statuses: readonly (typeof invoice.status.enumValues)[number][],
): Promise<MoneyTotal[]> {
  const rows = await db
    .select({ currency: invoice.currency, sum: sql<string>`coalesce(sum(${invoice.providerNetAmount}), 0)` })
    .from(invoice)
    .where(and(scope, inArray(invoice.status, statuses)))
    .groupBy(invoice.currency)
  return rows.map((r) => ({ currency: r.currency, amount: Number(r.sum) }))
}

/** A doctor's own net earnings — invoices for cases assigned to them.
 *  Joins through aestheticCase since invoice has no doctorId of its own. */
export async function getDoctorEarningsSummary(doctorProfileId: string): Promise<EarningsSummary> {
  if (!isDbConfigured) return EMPTY

  const doctorInvoiceIds = db
    .select({ id: invoice.id })
    .from(invoice)
    .innerJoin(aestheticCase, eq(invoice.caseId, aestheticCase.id))
    .where(eq(aestheticCase.doctorId, doctorProfileId))
  const scope = inArray(invoice.id, doctorInvoiceIds)

  const [collected, pending, recent, countRow] = await Promise.all([
    netByStatus(scope, COLLECTED_STATUSES),
    netByStatus(scope, PENDING_STATUSES),
    db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        currency: invoice.currency,
        total: invoice.total,
        platformCommissionAmount: invoice.platformCommissionAmount,
        providerNetAmount: invoice.providerNetAmount,
        patientName: userT.name,
        createdAt: invoice.createdAt,
      })
      .from(invoice)
      .innerJoin(userT, eq(invoice.patientUserId, userT.id))
      .where(and(scope, sql`${invoice.status} != 'DRAFT'`))
      .orderBy(desc(invoice.createdAt))
      .limit(20),
    db
      .select({ n: sql<number>`count(*)` })
      .from(invoice)
      .where(and(scope, sql`${invoice.status} != 'DRAFT'`))
      .then((r) => Number(r[0]?.n ?? 0)),
  ])

  return { collected, pending, invoiceCount: countRow, recent }
}

/** A center's own net earnings — its invoices, by the direct centerId column. */
export async function getCenterEarningsSummary(centerIds: string[]): Promise<EarningsSummary> {
  if (!isDbConfigured || centerIds.length === 0) return EMPTY
  const scope = inArray(invoice.centerId, centerIds)

  const [collected, pending, recent, countRow] = await Promise.all([
    netByStatus(scope, COLLECTED_STATUSES),
    netByStatus(scope, PENDING_STATUSES),
    db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        currency: invoice.currency,
        total: invoice.total,
        platformCommissionAmount: invoice.platformCommissionAmount,
        providerNetAmount: invoice.providerNetAmount,
        patientName: userT.name,
        createdAt: invoice.createdAt,
      })
      .from(invoice)
      .innerJoin(userT, eq(invoice.patientUserId, userT.id))
      .where(and(scope, sql`${invoice.status} != 'DRAFT'`))
      .orderBy(desc(invoice.createdAt))
      .limit(20),
    db
      .select({ n: sql<number>`count(*)` })
      .from(invoice)
      .where(and(scope, sql`${invoice.status} != 'DRAFT'`))
      .then((r) => Number(r[0]?.n ?? 0)),
  ])

  return { collected, pending, invoiceCount: countRow, recent }
}
