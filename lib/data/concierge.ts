import { desc, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  aestheticCase,
  procedure as procedureT,
  doctorProfile,
  center,
  user as userT,
  internalTask,
  caseStatusHistory,
  userRole,
  role as roleT,
} from "@/lib/db/schema"
import { ROLES } from "@/lib/rbac"

export type ConciergeCaseRow = {
  id: string
  reference: string
  status: string
  procedureName: string
  patientName: string
  doctorName: string | null
  centerName: string | null
  updatedAt: Date
}
export async function listAllCasesForConcierge(limit = 100): Promise<ConciergeCaseRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: aestheticCase.id,
      reference: aestheticCase.reference,
      status: aestheticCase.status,
      procedureName: procedureT.nameAr,
      patientName: userT.name,
      doctorName: doctorProfile.name,
      centerName: center.name,
      updatedAt: aestheticCase.updatedAt,
    })
    .from(aestheticCase)
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
    .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
    .leftJoin(center, eq(aestheticCase.centerId, center.id))
    .orderBy(desc(aestheticCase.updatedAt))
    .limit(limit)
}

export type InternalTaskRow = {
  id: string
  caseId: string | null
  title: string
  description: string | null
  priority: string
  status: string
  dueAt: Date | null
  assignedTo: string | null
  assigneeName: string | null
  patientName: string | null
  procedureName: string | null
}
export async function listInternalTasks(limit = 150): Promise<InternalTaskRow[]> {
  if (!isDbConfigured) return []
  const rows = await db
    .select({
      id: internalTask.id,
      caseId: internalTask.caseId,
      title: internalTask.title,
      description: internalTask.description,
      priority: internalTask.priority,
      status: internalTask.status,
      dueAt: internalTask.dueAt,
      assignedTo: internalTask.assignedTo,
      assigneeName: userT.name,
    })
    .from(internalTask)
    .leftJoin(userT, eq(internalTask.assignedTo, userT.id))
    .orderBy(desc(internalTask.dueAt))
    .limit(limit)

  const caseIds = rows.map((r) => r.caseId).filter((id): id is string => Boolean(id))
  const caseInfo = caseIds.length
    ? await db
        .select({ id: aestheticCase.id, patientName: userT.name, procedureName: procedureT.nameAr })
        .from(aestheticCase)
        .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
        .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
        .where(inArray(aestheticCase.id, caseIds))
    : []
  const caseById = new Map(caseInfo.map((c) => [c.id, c]))

  return rows.map((r) => ({
    ...r,
    patientName: r.caseId ? (caseById.get(r.caseId)?.patientName ?? null) : null,
    procedureName: r.caseId ? (caseById.get(r.caseId)?.procedureName ?? null) : null,
  }))
}

export type AssignableUser = { id: string; name: string }
export async function listAssignableUsers(): Promise<AssignableUser[]> {
  if (!isDbConfigured) return []
  const rows = await db
    .select({ id: userT.id, name: userT.name, roleKey: roleT.key })
    .from(userRole)
    .innerJoin(userT, eq(userRole.userId, userT.id))
    .innerJoin(roleT, eq(userRole.roleId, roleT.id))
  return rows
    .filter((r) => r.roleKey === ROLES.CONCIERGE || r.roleKey === ROLES.SUPPORT_AGENT)
    .map((r) => ({ id: r.id, name: r.name }))
}

export type CaseTimelineEntry = {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: Date
}
export async function getCaseStatusTimeline(caseId: string): Promise<CaseTimelineEntry[]> {
  if (!isDbConfigured) return []
  return db
    .select({ id: caseStatusHistory.id, fromStatus: caseStatusHistory.fromStatus, toStatus: caseStatusHistory.toStatus, note: caseStatusHistory.note, createdAt: caseStatusHistory.createdAt })
    .from(caseStatusHistory)
    .where(eq(caseStatusHistory.caseId, caseId))
    .orderBy(caseStatusHistory.createdAt)
}
