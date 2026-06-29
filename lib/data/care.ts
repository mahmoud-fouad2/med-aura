import { and, desc, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  consultationOutcome,
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
