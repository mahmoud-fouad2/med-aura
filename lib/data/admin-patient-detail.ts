import { desc, eq } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { aestheticCase, procedure as procedureT, doctorProfile, notification } from "@/lib/db/schema"

export type PatientCaseRow = {
  id: string
  reference: string
  status: string
  procedureNameAr: string
  doctorName: string | null
  createdAt: Date
}

/** A patient's cases, newest first — for the admin drawer's clinical tab. */
export async function listPatientCases(patientUserId: string): Promise<PatientCaseRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: aestheticCase.id,
      reference: aestheticCase.reference,
      status: aestheticCase.status,
      procedureNameAr: procedureT.nameAr,
      doctorName: doctorProfile.name,
      createdAt: aestheticCase.createdAt,
    })
    .from(aestheticCase)
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
    .where(eq(aestheticCase.patientUserId, patientUserId))
    .orderBy(desc(aestheticCase.createdAt))
}

export type PatientNotificationRow = {
  id: string
  type: string
  title: string
  createdAt: Date
  readAt: Date | null
}

/** A patient's most recent notifications — read-only visibility for support/admin. */
export async function listPatientNotifications(userId: string, limit = 10): Promise<PatientNotificationRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit)
}
