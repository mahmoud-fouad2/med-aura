import { and, desc, eq, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db, isDbConfigured } from "@/lib/db"
import { safetyAlert, aestheticCase, procedure as procedureT, user as userT } from "@/lib/db/schema"

const assignee = alias(userT, "assignee")

const OPEN_STATUSES = ["OPEN", "ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED", "REFERRED_TO_EMERGENCY"] as const
const CLOSED_STATUSES = ["RESOLVED", "REFERRED_TO_EMERGENCY", "FALSE_ALARM"] as const

export type AdminSafetyAlertRow = {
  id: string
  caseId: string
  caseReference: string
  severity: string
  status: string
  summary: string | null
  patientName: string
  procedureName: string
  assignedTo: string | null
  assignedToName: string | null
  fromSymptomReport: boolean
  createdAt: Date
}

export type SafetyAlertFilters = {
  status?: "open" | "closed" | string
  severity?: string
  assignedTo?: string
}

export async function listSafetyAlertsForAdmin(filters: SafetyAlertFilters = {}): Promise<AdminSafetyAlertRow[]> {
  if (!isDbConfigured) return []

  const conditions = []
  if (filters.status === "open") conditions.push(inArray(safetyAlert.status, OPEN_STATUSES))
  else if (filters.status === "closed") conditions.push(inArray(safetyAlert.status, CLOSED_STATUSES))
  else if (filters.status) conditions.push(eq(safetyAlert.status, filters.status as (typeof safetyAlert.status.enumValues)[number]))
  if (filters.severity) conditions.push(eq(safetyAlert.severity, filters.severity as (typeof safetyAlert.severity.enumValues)[number]))
  if (filters.assignedTo) conditions.push(eq(safetyAlert.assignedTo, filters.assignedTo))

  const rows = await db
    .select({
      id: safetyAlert.id,
      caseId: safetyAlert.caseId,
      caseReference: aestheticCase.reference,
      severity: safetyAlert.severity,
      status: safetyAlert.status,
      summary: safetyAlert.summary,
      patientName: userT.name,
      procedureName: procedureT.nameAr,
      assignedTo: safetyAlert.assignedTo,
      assignedToName: assignee.name,
      symptomReportId: safetyAlert.symptomReportId,
      createdAt: safetyAlert.createdAt,
    })
    .from(safetyAlert)
    .innerJoin(aestheticCase, eq(safetyAlert.caseId, aestheticCase.id))
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .innerJoin(userT, eq(safetyAlert.patientUserId, userT.id))
    .leftJoin(assignee, eq(safetyAlert.assignedTo, assignee.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(safetyAlert.createdAt))
    .limit(200)

  return rows.map((r) => ({
    id: r.id,
    caseId: r.caseId,
    caseReference: r.caseReference,
    severity: r.severity,
    status: r.status,
    summary: r.summary,
    patientName: r.patientName,
    procedureName: r.procedureName,
    assignedTo: r.assignedTo,
    assignedToName: r.assignedToName,
    fromSymptomReport: Boolean(r.symptomReportId),
    createdAt: r.createdAt,
  }))
}

/** Staff who can be assigned a safety alert: anyone holding safety:manage. */
export async function listSafetyAssignees(): Promise<{ id: string; name: string }[]> {
  if (!isDbConfigured) return []
  const { userRole, role: roleT } = await import("@/lib/db/schema")
  const { ROLES } = await import("@/lib/rbac")
  const rows = await db
    .selectDistinct({ id: userT.id, name: userT.name })
    .from(userRole)
    .innerJoin(roleT, eq(userRole.roleId, roleT.id))
    .innerJoin(userT, eq(userRole.userId, userT.id))
    .where(inArray(roleT.key, [ROLES.CONCIERGE, ROLES.DOCTOR, ROLES.COMPLIANCE_REVIEWER, ROLES.SUPER_ADMIN]))
    .orderBy(userT.name)
  return rows
}
