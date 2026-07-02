import { and, count, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  patientProfile,
  aestheticCase,
  providerApplication,
  doctorProfile,
  center,
  followUpTask,
  followUpPlan,
  safetyAlert,
  payment,
  refundRequest,
  procedure as procedureT,
  user as userT,
} from "@/lib/db/schema"

const ACTIVE_CASE_STATUSES = [
  "SUBMITTED", "MATCHING", "SHARED_WITH_PROVIDER", "UNDER_REVIEW",
  "MORE_INFORMATION_REQUIRED", "CONSULTATION_REQUIRED", "CONSULTATION_BOOKED",
  "CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED", "QUOTE_ISSUED",
  "PATIENT_REVIEWING", "QUOTE_ACCEPTED", "DEPOSIT_PAID", "MEDICALLY_APPROVED",
  "CENTER_CONFIRMED", "FULLY_PAID", "PROCEDURE_CONFIRMED", "PROCEDURE_COMPLETED",
  "FOLLOW_UP",
] as const
const OPEN_SAFETY_STATUSES = ["OPEN", "ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED", "REFERRED_TO_EMERGENCY"] as const
const OPEN_REFUND_STATUSES = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROVIDER_CONFIRMED"] as const
const PENDING_PAYMENT_STATUSES = ["CREATED", "PENDING", "REQUIRES_ACTION"] as const
const PENDING_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"] as const

export type AdminOverviewKpis = {
  totalPatients: number
  newCasesThisWeek: number
  activeCases: number
  casesNeedingIntervention: number
  pendingApplications: number
  approvedDoctors: number
  approvedCenters: number
  overdueFollowUps: number
  openSafetyAlerts: number
  pendingPayments: number
  /** Only populated when the caller has finance visibility (see getAdminOverviewKpis). */
  totalPaidAmount: number | null
  openRefundRequests: number | null
}

/**
 * Every count is a single aggregate query (no N+1), run in parallel.
 * Financial figures (totalPaidAmount, openRefundRequests) are only computed
 * when `includeFinance` is true — callers must gate that on FINANCE_ACCESS.
 */
export async function getAdminOverviewKpis(includeFinance: boolean): Promise<AdminOverviewKpis> {
  const empty: AdminOverviewKpis = {
    totalPatients: 0, newCasesThisWeek: 0, activeCases: 0, casesNeedingIntervention: 0,
    pendingApplications: 0, approvedDoctors: 0, approvedCenters: 0, overdueFollowUps: 0,
    openSafetyAlerts: 0, pendingPayments: 0, totalPaidAmount: null, openRefundRequests: null,
  }
  if (!isDbConfigured) return empty

  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const now = new Date()

  const [
    totalPatients,
    newCasesThisWeek,
    activeCases,
    interventionCaseIds,
    pendingApplications,
    approvedDoctors,
    approvedCenters,
    overdueFollowUps,
    openSafetyAlerts,
    pendingPayments,
    financeRows,
  ] = await Promise.all([
    db.select({ n: count() }).from(patientProfile),
    db.select({ n: count() }).from(aestheticCase).where(gte(aestheticCase.createdAt, weekAgo)),
    db.select({ n: count() }).from(aestheticCase).where(inArray(aestheticCase.status, [...ACTIVE_CASE_STATUSES])),
    db
      .selectDistinct({ caseId: safetyAlert.caseId })
      .from(safetyAlert)
      .where(inArray(safetyAlert.status, OPEN_SAFETY_STATUSES)),
    db.select({ n: count() }).from(providerApplication).where(inArray(providerApplication.status, PENDING_APPLICATION_STATUSES)),
    db.select({ n: count() }).from(doctorProfile).where(eq(doctorProfile.status, "approved")),
    db.select({ n: count() }).from(center).where(eq(center.status, "approved")),
    db
      .select({ n: count() })
      .from(followUpTask)
      .where(
        or(
          eq(followUpTask.status, "MISSED"),
          and(inArray(followUpTask.status, ["SCHEDULED", "DUE"]), lt(followUpTask.dueAt, now)),
        ),
      ),
    db.select({ n: count() }).from(safetyAlert).where(inArray(safetyAlert.status, OPEN_SAFETY_STATUSES)),
    db.select({ n: count() }).from(payment).where(inArray(payment.status, PENDING_PAYMENT_STATUSES)),
    includeFinance
      ? Promise.all([
          db.select({ sum: sql<string>`coalesce(sum(${payment.amount}), 0)` }).from(payment).where(eq(payment.status, "PAID")),
          db.select({ n: count() }).from(refundRequest).where(inArray(refundRequest.status, OPEN_REFUND_STATUSES)),
        ])
      : Promise.resolve(null),
  ])

  // cases needing intervention: open safety alert OR MORE_INFORMATION_REQUIRED OR an escalated follow-up
  const moreInfoCases = await db
    .select({ id: aestheticCase.id })
    .from(aestheticCase)
    .where(eq(aestheticCase.status, "MORE_INFORMATION_REQUIRED"))
  const escalatedFollowUpCases = await db
    .selectDistinct({ caseId: followUpPlan.caseId })
    .from(followUpTask)
    .innerJoin(followUpPlan, eq(followUpTask.planId, followUpPlan.id))
    .where(eq(followUpTask.status, "ESCALATED"))
  const interventionSet = new Set<string>([
    ...interventionCaseIds.map((r) => r.caseId),
    ...moreInfoCases.map((r) => r.id),
    ...escalatedFollowUpCases.map((r) => r.caseId),
  ])

  return {
    totalPatients: totalPatients[0]?.n ?? 0,
    newCasesThisWeek: newCasesThisWeek[0]?.n ?? 0,
    activeCases: activeCases[0]?.n ?? 0,
    casesNeedingIntervention: interventionSet.size,
    pendingApplications: pendingApplications[0]?.n ?? 0,
    approvedDoctors: approvedDoctors[0]?.n ?? 0,
    approvedCenters: approvedCenters[0]?.n ?? 0,
    overdueFollowUps: overdueFollowUps[0]?.n ?? 0,
    openSafetyAlerts: openSafetyAlerts[0]?.n ?? 0,
    pendingPayments: pendingPayments[0]?.n ?? 0,
    totalPaidAmount: financeRows ? Number(financeRows[0][0]?.sum ?? 0) : null,
    openRefundRequests: financeRows ? (financeRows[1][0]?.n ?? 0) : null,
  }
}

export type InterventionCaseRow = {
  id: string
  reference: string
  status: string
  procedureName: string
  patientName: string
  reason: string
}
/** Cases needing intervention now, with a human reason — capped for the overview widget. */
export async function listCasesNeedingIntervention(limit = 8): Promise<InterventionCaseRow[]> {
  if (!isDbConfigured) return []
  const rows = await db
    .select({
      id: aestheticCase.id,
      reference: aestheticCase.reference,
      status: aestheticCase.status,
      procedureName: procedureT.nameAr,
      patientName: userT.name,
    })
    .from(aestheticCase)
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
    .where(eq(aestheticCase.status, "MORE_INFORMATION_REQUIRED"))
    .orderBy(desc(aestheticCase.updatedAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, reason: "بحاجة لمعلومات إضافية من المريض" }))
}

export type RecentApplicationRow = { id: string; applicantName: string; kind: string; submittedAt: Date | null }
export async function listRecentApplications(limit = 6): Promise<RecentApplicationRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({ id: providerApplication.id, applicantName: userT.name, kind: providerApplication.kind, submittedAt: providerApplication.submittedAt })
    .from(providerApplication)
    .innerJoin(userT, eq(providerApplication.applicantUserId, userT.id))
    .where(inArray(providerApplication.status, PENDING_APPLICATION_STATUSES))
    .orderBy(desc(providerApplication.submittedAt))
    .limit(limit)
}

export type HighPrioritySafetyRow = { id: string; caseId: string; severity: string; status: string; summary: string | null; createdAt: Date; patientName: string }
export async function listHighPrioritySafetyAlerts(limit = 6): Promise<HighPrioritySafetyRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: safetyAlert.id,
      caseId: safetyAlert.caseId,
      severity: safetyAlert.severity,
      status: safetyAlert.status,
      summary: safetyAlert.summary,
      createdAt: safetyAlert.createdAt,
      patientName: userT.name,
    })
    .from(safetyAlert)
    .innerJoin(userT, eq(safetyAlert.patientUserId, userT.id))
    .where(and(inArray(safetyAlert.status, OPEN_SAFETY_STATUSES), inArray(safetyAlert.severity, ["HIGH", "CRITICAL"])))
    .orderBy(desc(safetyAlert.createdAt))
    .limit(limit)
}
