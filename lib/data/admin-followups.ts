import { and, desc, eq, inArray, lt, or } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { followUpTask, followUpPlan, aestheticCase, doctorProfile, user as userT } from "@/lib/db/schema"

const OPEN_STATUSES = ["SCHEDULED", "DUE", "SUBMITTED", "UNDER_REVIEW"] as const

export type AdminFollowUpRow = {
  id: string
  title: string
  type: string
  status: string
  dueAt: Date | null
  caseId: string
  caseReference: string
  patientName: string
  doctorName: string | null
  overdue: boolean
}

export type FollowUpFilters = {
  status?: "open" | "overdue" | "completed" | string
}

export async function listFollowUpsForAdmin(filters: FollowUpFilters = {}): Promise<AdminFollowUpRow[]> {
  if (!isDbConfigured) return []

  const now = new Date()
  const conditions = []
  if (filters.status === "overdue") {
    conditions.push(
      or(eq(followUpTask.status, "MISSED"), and(inArray(followUpTask.status, ["SCHEDULED", "DUE"]), lt(followUpTask.dueAt, now)))!,
    )
  } else if (filters.status === "open") {
    conditions.push(inArray(followUpTask.status, OPEN_STATUSES))
  } else if (filters.status === "completed") {
    conditions.push(inArray(followUpTask.status, ["COMPLETED", "CANCELLED"]))
  } else if (filters.status) {
    conditions.push(eq(followUpTask.status, filters.status as (typeof followUpTask.status.enumValues)[number]))
  }

  const rows = await db
    .select({
      id: followUpTask.id,
      title: followUpTask.title,
      type: followUpTask.type,
      status: followUpTask.status,
      dueAt: followUpTask.dueAt,
      caseId: aestheticCase.id,
      caseReference: aestheticCase.reference,
      patientName: userT.name,
      doctorName: doctorProfile.name,
    })
    .from(followUpTask)
    .innerJoin(followUpPlan, eq(followUpTask.planId, followUpPlan.id))
    .innerJoin(aestheticCase, eq(followUpPlan.caseId, aestheticCase.id))
    .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
    .leftJoin(doctorProfile, eq(followUpPlan.doctorId, doctorProfile.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(followUpTask.dueAt))
    .limit(200)

  return rows.map((r) => ({
    ...r,
    overdue: r.status === "MISSED" || (["SCHEDULED", "DUE"].includes(r.status) && r.dueAt != null && r.dueAt < now),
  }))
}
