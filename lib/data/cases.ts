import { and, eq, desc, isNull, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  aestheticCase,
  procedure as procedureT,
  doctorProfile,
  center as centerT,
  medicalDocument,
  consent,
  user as userT,
} from "@/lib/db/schema"
import { canAccessCase } from "@/lib/rbac"
import { getDoctorProfileId } from "@/lib/data/appointments"
import { getPublicUrl } from "@/lib/storage/r2"

export type CaseListItem = {
  id: string
  reference: string
  status: string
  procedureName: string
  doctorName: string | null
  doctorPhotoUrl: string | null
  createdAt: Date
}

export async function listCasesForPatient(
  userId: string,
): Promise<CaseListItem[]> {
  const rows = await db
    .select({
      id: aestheticCase.id,
      reference: aestheticCase.reference,
      status: aestheticCase.status,
      procedureName: procedureT.nameAr,
      doctorName: doctorProfile.name,
      doctorPhotoKey: doctorProfile.photoKey,
      createdAt: aestheticCase.createdAt,
    })
    .from(aestheticCase)
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
    .where(
      and(eq(aestheticCase.patientUserId, userId), isNull(aestheticCase.deletedAt)),
    )
    .orderBy(desc(aestheticCase.createdAt))
  return rows.map(({ doctorPhotoKey, ...r }) => ({
    ...r,
    doctorPhotoUrl: doctorPhotoKey ? getPublicUrl(doctorPhotoKey) : null,
  }))
}

export type CaseDocument = {
  id: string
  fileName: string
  kind: string
  contentType: string
  createdAt: Date
}

export type CaseDetail = {
  id: string
  reference: string
  status: string
  goal: string | null
  description: string | null
  ageYears: number | null
  answers: Record<string, unknown>
  procedureName: string
  patientUserId: string
  patientName: string
  centerId: string | null
  centerName: string | null
  doctorId: string | null
  doctorName: string | null
  doctorSlug: string | null
  documents: CaseDocument[]
  consentActive: boolean
  isOwner: boolean
}

/** Returns the case for any authorized viewer (owner, admin, or granted doctor). */
export async function getCaseDetailForUser(
  userId: string,
  caseId: string,
): Promise<CaseDetail | null> {
  if (!(await canAccessCase(userId, caseId))) return null

  const row = (
    await db
      .select({
        id: aestheticCase.id,
        reference: aestheticCase.reference,
        status: aestheticCase.status,
        goal: aestheticCase.goal,
        description: aestheticCase.description,
        ageYears: aestheticCase.ageYears,
        answers: aestheticCase.answers,
        patientUserId: aestheticCase.patientUserId,
        patientName: userT.name,
        centerId: aestheticCase.centerId,
        centerName: centerT.name,
        doctorId: aestheticCase.doctorId,
        procedureName: procedureT.nameAr,
        doctorName: doctorProfile.name,
        doctorSlug: doctorProfile.slug,
      })
      .from(aestheticCase)
      .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
      .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
      .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
      .leftJoin(centerT, eq(aestheticCase.centerId, centerT.id))
      .where(eq(aestheticCase.id, caseId))
      .limit(1)
  )[0]
  if (!row) return null

  const documents = await db
    .select({
      id: medicalDocument.id,
      fileName: medicalDocument.fileName,
      kind: medicalDocument.kind,
      contentType: medicalDocument.contentType,
      createdAt: medicalDocument.createdAt,
    })
    .from(medicalDocument)
    .where(
      and(
        eq(medicalDocument.caseId, caseId),
        eq(medicalDocument.finalized, true),
        isNull(medicalDocument.deletedAt),
      ),
    )
    .orderBy(desc(medicalDocument.createdAt))

  let consentActive = false
  if (row.doctorId) {
    const c = await db
      .select({ id: consent.id })
      .from(consent)
      .where(and(eq(consent.caseId, caseId), eq(consent.status, "GRANTED")))
      .limit(1)
    consentActive = c.length > 0
  }

  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    goal: row.goal,
    description: row.description,
    ageYears: row.ageYears,
    answers: (row.answers ?? {}) as Record<string, unknown>,
    procedureName: row.procedureName,
    patientUserId: row.patientUserId,
    patientName: row.patientName,
    centerId: row.centerId,
    centerName: row.centerName,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    doctorSlug: row.doctorSlug,
    documents,
    consentActive,
    isOwner: row.patientUserId === userId,
  }
}

export type DoctorCaseItem = {
  id: string
  reference: string
  status: string
  procedureName: string
  patientName: string
  consentActive: boolean
}

/** Cases assigned to a doctor, flagged by whether the patient has shared access. */
export async function listDoctorAssignedCases(
  doctorUserId: string,
): Promise<DoctorCaseItem[]> {
  const profileId = await getDoctorProfileId(doctorUserId)
  if (!profileId) return []

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
    .where(
      and(eq(aestheticCase.doctorId, profileId), isNull(aestheticCase.deletedAt)),
    )
    .orderBy(desc(aestheticCase.createdAt))
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const grants = await db
    .select({ caseId: consent.caseId })
    .from(consent)
    .where(
      and(
        inArray(consent.caseId, ids),
        eq(consent.granteeUserId, doctorUserId),
        eq(consent.status, "GRANTED"),
      ),
    )
  const sharedSet = new Set(grants.map((g) => g.caseId))

  return rows.map((r) => ({ ...r, consentActive: sharedSet.has(r.id) }))
}
