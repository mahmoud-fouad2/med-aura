import { and, desc, eq, inArray, lt } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  consultationOutcome,
  treatmentPlan,
  quote,
  quoteItem,
  procedureBooking,
  medicalApproval,
  review,
  followUpPlan,
  followUpTask,
  followUpEntry,
  safetyAlert,
  invoice,
} from "@/lib/db/schema"

export type CareConsultation = {
  id: string
  status: string
  startsAt: Date
  doctorUserId: string | null
}

const CONSULTATION_TYPES = [
  "VIDEO_CONSULTATION",
  "IN_PERSON_CONSULTATION",
  "PHONE_CONSULTATION",
] as const

/** Latest consultation-type appointment for a case (with the doctor's userId). */
export async function getLatestConsultation(
  caseId: string,
): Promise<CareConsultation | null> {
  if (!isDbConfigured) return null
  const rows = await db
    .select({
      id: appointment.id,
      status: appointment.status,
      startsAt: appointment.startsAt,
      doctorUserId: doctorProfile.userId,
    })
    .from(appointment)
    .leftJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .where(
      and(
        eq(appointment.caseId, caseId),
        inArray(appointment.type, [...CONSULTATION_TYPES]),
      ),
    )
    .orderBy(desc(appointment.startsAt))
    .limit(1)
  return rows[0] ?? null
}

export type OutcomePublic = {
  suitabilityStatus: string
  patientVisibleNotes: string | null
  completedAt: Date | null
}

/** Patient-safe consultation outcome (never exposes internal notes). */
export async function getOutcomePublic(
  caseId: string,
): Promise<OutcomePublic | null> {
  if (!isDbConfigured) return null
  const rows = await db
    .select({
      suitabilityStatus: consultationOutcome.suitabilityStatus,
      patientVisibleNotes: consultationOutcome.patientVisibleNotes,
      completedAt: consultationOutcome.completedAt,
    })
    .from(consultationOutcome)
    .where(eq(consultationOutcome.caseId, caseId))
    .orderBy(desc(consultationOutcome.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export type CarePlan = {
  id: string
  status: string
  title: string
  medicalAssessment: string | null
  anesthesiaType: string | null
  recoveryPeriod: string | null
  preProcedureInstructions: string | null
  postProcedureInstructions: string | null
  mainRisks: string | null
  contraindications: string | null
  version: number
  publishedAt: Date | null
}

/** Latest treatment plan for a case (any status). */
export async function getTreatmentPlan(caseId: string): Promise<CarePlan | null> {
  if (!isDbConfigured) return null
  const rows = await db
    .select({
      id: treatmentPlan.id,
      status: treatmentPlan.status,
      title: treatmentPlan.title,
      medicalAssessment: treatmentPlan.medicalAssessment,
      anesthesiaType: treatmentPlan.anesthesiaType,
      recoveryPeriod: treatmentPlan.recoveryPeriod,
      preProcedureInstructions: treatmentPlan.preProcedureInstructions,
      postProcedureInstructions: treatmentPlan.postProcedureInstructions,
      mainRisks: treatmentPlan.mainRisks,
      contraindications: treatmentPlan.contraindications,
      version: treatmentPlan.version,
      publishedAt: treatmentPlan.publishedAt,
    })
    .from(treatmentPlan)
    .where(eq(treatmentPlan.caseId, caseId))
    .orderBy(desc(treatmentPlan.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export type CareQuoteItem = {
  category: string
  descriptionAr: string
  quantity: number
  unitPrice: string
  total: string
}
export type CareQuote = {
  id: string
  quoteNumber: string
  status: string
  currency: string
  subtotal: string
  discount: string
  tax: string
  total: string
  depositRequired: string
  remainingBalance: string
  expiryDate: Date | null
  items: CareQuoteItem[]
}

/** Latest non-superseded quote for a case, with its line items. */
export async function getQuoteForCase(caseId: string): Promise<CareQuote | null> {
  if (!isDbConfigured) return null
  const q = (
    await db
      .select()
      .from(quote)
      .where(eq(quote.caseId, caseId))
      .orderBy(desc(quote.createdAt))
      .limit(1)
  )[0]
  if (!q) return null
  const items = await db
    .select({
      category: quoteItem.category,
      descriptionAr: quoteItem.descriptionAr,
      quantity: quoteItem.quantity,
      unitPrice: quoteItem.unitPrice,
      total: quoteItem.total,
    })
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, q.id))
    .orderBy(quoteItem.sortOrder)
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    status: q.status,
    currency: q.currency,
    subtotal: q.subtotal,
    discount: q.discount,
    tax: q.tax,
    total: q.total,
    depositRequired: q.depositRequired,
    remainingBalance: q.remainingBalance,
    expiryDate: q.expiryDate,
    items,
  }
}

export type CareBooking = { id: string; status: string }
export async function getActiveBooking(caseId: string): Promise<CareBooking | null> {
  if (!isDbConfigured) return null
  const rows = await db
    .select({ id: procedureBooking.id, status: procedureBooking.status })
    .from(procedureBooking)
    .where(eq(procedureBooking.caseId, caseId))
    .orderBy(desc(procedureBooking.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export type CareStage = {
  booking: { id: string; status: string; scheduledDate: string | null } | null
  approvalStatus: string | null
  hasReview: boolean
}

/** Aggregated late-stage care state for driving the case action panels. */
export async function getCareStage(caseId: string): Promise<CareStage> {
  const empty: CareStage = { booking: null, approvalStatus: null, hasReview: false }
  if (!isDbConfigured) return empty
  const [booking, approval, reviews] = await Promise.all([
    db
      .select({ id: procedureBooking.id, status: procedureBooking.status, scheduledDate: procedureBooking.scheduledDate })
      .from(procedureBooking)
      .where(eq(procedureBooking.caseId, caseId))
      .orderBy(desc(procedureBooking.createdAt))
      .limit(1),
    db
      .select({ status: medicalApproval.status })
      .from(medicalApproval)
      .where(eq(medicalApproval.caseId, caseId))
      .orderBy(desc(medicalApproval.createdAt))
      .limit(1),
    db.select({ id: review.id }).from(review).where(eq(review.caseId, caseId)).limit(1),
  ])
  return {
    booking: booking[0] ?? null,
    approvalStatus: approval[0]?.status ?? null,
    hasReview: reviews.length > 0,
  }
}

/** True if `userId` is the doctor assigned to this case (resource-level check). */
export async function isCaseDoctor(
  userId: string,
  caseDoctorId: string | null,
): Promise<boolean> {
  if (!caseDoctorId) return false
  const rows = await db
    .select({ userId: doctorProfile.userId })
    .from(doctorProfile)
    .where(eq(doctorProfile.id, caseDoctorId))
    .limit(1)
  return rows[0]?.userId === userId
}

export type FollowUpEntryView = {
  painScore: number | null
  notes: string | null
  answers: Record<string, unknown> | null
  documentIds: string[]
  createdAt: Date
}
export type FollowUpTaskView = {
  id: string
  type: string
  title: string
  instructions: string | null
  requiredPhotos: number
  dueAt: Date | null
  status: string
  submittedAt: Date | null
  reviewedAt: Date | null
  reviewNotes: string | null
  latestEntry: FollowUpEntryView | null
}

/**
 * Follow-up tasks for a case's latest plan. Lazily flips overdue SCHEDULED/DUE
 * tasks to MISSED before reading — no cron needed since this is the only read path.
 */
export async function getFollowUpTasksForCase(caseId: string): Promise<FollowUpTaskView[]> {
  if (!isDbConfigured) return []
  const plan = (
    await db.select({ id: followUpPlan.id }).from(followUpPlan).where(eq(followUpPlan.caseId, caseId)).orderBy(desc(followUpPlan.createdAt)).limit(1)
  )[0]
  if (!plan) return []

  await db
    .update(followUpTask)
    .set({ status: "MISSED" })
    .where(
      and(
        eq(followUpTask.planId, plan.id),
        inArray(followUpTask.status, ["SCHEDULED", "DUE"]),
        lt(followUpTask.dueAt, new Date()),
      ),
    )

  const tasks = await db
    .select()
    .from(followUpTask)
    .where(eq(followUpTask.planId, plan.id))
    .orderBy(followUpTask.dueAt)
  if (tasks.length === 0) return []

  const entries = await db
    .select()
    .from(followUpEntry)
    .where(inArray(followUpEntry.taskId, tasks.map((t) => t.id)))
    .orderBy(desc(followUpEntry.createdAt))
  const latestByTask = new Map<string, (typeof entries)[number]>()
  for (const e of entries) if (!latestByTask.has(e.taskId)) latestByTask.set(e.taskId, e)

  return tasks.map((t) => {
    const e = latestByTask.get(t.id)
    return {
      id: t.id,
      type: t.type,
      title: t.title,
      instructions: t.instructions,
      requiredPhotos: t.requiredPhotos,
      dueAt: t.dueAt,
      status: t.status,
      submittedAt: t.submittedAt,
      reviewedAt: t.reviewedAt,
      reviewNotes: t.reviewNotes,
      latestEntry: e
        ? {
            painScore: e.painScore,
            notes: e.notes,
            answers: (e.answers ?? null) as Record<string, unknown> | null,
            documentIds: (e.documentIds ?? []) as string[],
            createdAt: e.createdAt,
          }
        : null,
    }
  })
}

export type SafetyAlertView = {
  id: string
  severity: string
  status: string
  summary: string | null
  createdAt: Date
  acknowledgedAt: Date | null
  resolvedAt: Date | null
  resolutionNotes: string | null
}

export async function getSafetyAlertsForCase(caseId: string): Promise<SafetyAlertView[]> {
  if (!isDbConfigured) return []
  const rows = await db
    .select({
      id: safetyAlert.id,
      severity: safetyAlert.severity,
      status: safetyAlert.status,
      summary: safetyAlert.summary,
      createdAt: safetyAlert.createdAt,
      acknowledgedAt: safetyAlert.acknowledgedAt,
      resolvedAt: safetyAlert.resolvedAt,
      resolutionNotes: safetyAlert.resolutionNotes,
    })
    .from(safetyAlert)
    .where(eq(safetyAlert.caseId, caseId))
    .orderBy(desc(safetyAlert.createdAt))
  return rows
}

export type InvoiceView = {
  id: string
  invoiceNumber: string
  currency: string
  total: string
  paidAmount: string
  remainingAmount: string
  status: string
}

export async function getInvoiceForCase(caseId: string): Promise<InvoiceView | null> {
  if (!isDbConfigured) return null
  const rows = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      status: invoice.status,
    })
    .from(invoice)
    .where(eq(invoice.caseId, caseId))
    .orderBy(desc(invoice.createdAt))
    .limit(1)
  return rows[0] ?? null
}
