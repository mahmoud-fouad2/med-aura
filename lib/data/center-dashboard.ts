import { desc, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  aestheticCase,
  procedure as procedureT,
  user as userT,
  doctorProfile,
  centerStaff,
  quote,
  procedureBooking,
  invoice,
  followUpTask,
  followUpPlan,
  safetyAlert,
  review,
} from "@/lib/db/schema"

export type CenterCaseRow = {
  id: string
  reference: string
  status: string
  procedureName: string
  patientName: string
  updatedAt: Date
}
export async function listCenterCases(centerIds: string[], limit = 40): Promise<CenterCaseRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({
      id: aestheticCase.id,
      reference: aestheticCase.reference,
      status: aestheticCase.status,
      procedureName: procedureT.nameAr,
      patientName: userT.name,
      updatedAt: aestheticCase.updatedAt,
    })
    .from(aestheticCase)
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
    .where(inArray(aestheticCase.centerId, centerIds))
    .orderBy(desc(aestheticCase.updatedAt))
    .limit(limit)
}

export type CenterPersonRow = { id: string; userId: string; name: string; role: string }
export async function listCenterPeople(centerIds: string[]): Promise<CenterPersonRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  const [doctors, staff] = await Promise.all([
    db
      .select({ userId: doctorProfile.userId, name: doctorProfile.name })
      .from(doctorProfile)
      .where(inArray(doctorProfile.centerId, centerIds)),
    db
      .select({ userId: centerStaff.userId, name: userT.name, role: centerStaff.role })
      .from(centerStaff)
      .innerJoin(userT, eq(centerStaff.userId, userT.id))
      .where(inArray(centerStaff.centerId, centerIds)),
  ])
  const rows: CenterPersonRow[] = doctors.map((d) => ({ id: d.userId, userId: d.userId, name: d.name, role: "طبيب" }))
  for (const s of staff) rows.push({ id: s.userId, userId: s.userId, name: s.name, role: s.role })
  return rows
}

export type CenterQuoteRow = { id: string; quoteNumber: string; status: string; total: string; currency: string; createdAt: Date }
export async function listCenterQuotes(centerIds: string[], limit = 20): Promise<CenterQuoteRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({ id: quote.id, quoteNumber: quote.quoteNumber, status: quote.status, total: quote.total, currency: quote.currency, createdAt: quote.createdAt })
    .from(quote)
    .where(inArray(quote.centerId, centerIds))
    .orderBy(desc(quote.createdAt))
    .limit(limit)
}

export type CenterBookingRow = { id: string; caseId: string; status: string; scheduledDate: string | null; patientName: string }
export async function listCenterBookings(centerIds: string[], limit = 30): Promise<CenterBookingRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({
      id: procedureBooking.id,
      caseId: procedureBooking.caseId,
      status: procedureBooking.status,
      scheduledDate: procedureBooking.scheduledDate,
      patientName: userT.name,
    })
    .from(procedureBooking)
    .innerJoin(userT, eq(procedureBooking.patientUserId, userT.id))
    .where(inArray(procedureBooking.centerId, centerIds))
    .orderBy(desc(procedureBooking.createdAt))
    .limit(limit)
}

export type CenterInvoiceRow = { id: string; invoiceNumber: string; status: string; total: string; remainingAmount: string; currency: string }
export async function listCenterInvoices(centerIds: string[], limit = 30): Promise<CenterInvoiceRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status, total: invoice.total, remainingAmount: invoice.remainingAmount, currency: invoice.currency })
    .from(invoice)
    .where(inArray(invoice.centerId, centerIds))
    .orderBy(desc(invoice.createdAt))
    .limit(limit)
}

export type CenterFollowUpRow = { id: string; caseId: string; title: string; status: string; dueAt: Date | null }
export async function listCenterFollowUps(centerIds: string[], limit = 30): Promise<CenterFollowUpRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({ id: followUpTask.id, caseId: followUpPlan.caseId, title: followUpTask.title, status: followUpTask.status, dueAt: followUpTask.dueAt })
    .from(followUpTask)
    .innerJoin(followUpPlan, eq(followUpTask.planId, followUpPlan.id))
    .innerJoin(aestheticCase, eq(followUpPlan.caseId, aestheticCase.id))
    .where(inArray(aestheticCase.centerId, centerIds))
    .orderBy(desc(followUpTask.dueAt))
    .limit(limit)
}

export type CenterSafetyRow = { id: string; caseId: string; severity: string; status: string; summary: string | null; createdAt: Date }
export async function listCenterSafetyAlerts(centerIds: string[], limit = 20): Promise<CenterSafetyRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({ id: safetyAlert.id, caseId: safetyAlert.caseId, severity: safetyAlert.severity, status: safetyAlert.status, summary: safetyAlert.summary, createdAt: safetyAlert.createdAt })
    .from(safetyAlert)
    .innerJoin(aestheticCase, eq(safetyAlert.caseId, aestheticCase.id))
    .where(inArray(aestheticCase.centerId, centerIds))
    .orderBy(desc(safetyAlert.createdAt))
    .limit(limit)
}

export type CenterReviewRow = { id: string; overallRating: number; comment: string | null; createdAt: Date }
export async function listCenterReviews(centerIds: string[], limit = 20): Promise<CenterReviewRow[]> {
  if (!isDbConfigured || centerIds.length === 0) return []
  return db
    .select({ id: review.id, overallRating: review.overallRating, comment: review.comment, createdAt: review.createdAt })
    .from(review)
    .where(inArray(review.centerId, centerIds))
    .orderBy(desc(review.createdAt))
    .limit(limit)
}
