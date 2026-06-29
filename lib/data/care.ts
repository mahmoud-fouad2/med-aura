import { and, desc, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  consultationOutcome,
  treatmentPlan,
  quote,
  quoteItem,
  procedureBooking,
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
