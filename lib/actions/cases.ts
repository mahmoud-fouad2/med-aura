"use server"

import { z } from "zod"
import { and, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  caseStatusHistory,
  procedure as procedureT,
  doctorProfile,
  medicalDocument,
  consent,
  documentAccessGrant,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS, canAccessCase } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation, forbidden } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

function caseReference(): string {
  const s = crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()
  return `CASE-${s}`
}

const createCaseSchema = z.object({
  procedureSlug: z.string().min(1, "اختر الإجراء"),
  doctorId: z.string().optional(),
  goal: z.string().max(500).optional(),
  description: z.string().max(4000).optional(),
  ageYears: z.coerce.number().int().min(0).max(120).optional(),
  preferredCountry: z.string().optional(),
  preferredCity: z.string().optional(),
  needsTravel: z.boolean().optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
})

export async function createCase(
  input: unknown,
): Promise<ActionResult<{ caseId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CASE_CREATE)

    const parsed = createCaseSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    }
    const data = parsed.data

    const proc = (
      await db
        .select({ id: procedureT.id })
        .from(procedureT)
        .where(eq(procedureT.slug, data.procedureSlug))
        .limit(1)
    )[0]
    if (!proc) throw validation("الإجراء غير موجود.")

    let centerId: string | null = null
    if (data.doctorId) {
      const doc = (
        await db
          .select({ id: doctorProfile.id, centerId: doctorProfile.centerId })
          .from(doctorProfile)
          .where(eq(doctorProfile.id, data.doctorId))
          .limit(1)
      )[0]
      if (!doc) throw validation("الطبيب غير موجود.")
      centerId = doc.centerId
    }

    const reference = caseReference()
    const caseId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(aestheticCase)
        .values({
          reference,
          patientUserId: user.id,
          procedureId: proc.id,
          doctorId: data.doctorId ?? null,
          centerId,
          status: "SUBMITTED",
          goal: data.goal,
          description: data.description,
          ageYears: data.ageYears,
          preferredCountry: data.preferredCountry,
          preferredCity: data.preferredCity,
          needsTravel: data.needsTravel ?? false,
          answers: data.answers ?? {},
          createdBy: user.id,
        })
        .returning({ id: aestheticCase.id })
      const id = inserted[0].id
      await tx.insert(caseStatusHistory).values({
        caseId: id,
        toStatus: "SUBMITTED",
        changedBy: user.id,
      })
      await writeAudit(
        {
          action: "case.create",
          actorUserId: user.id,
          entityType: "aesthetic_case",
          entityId: id,
        },
        tx,
      )
      return id
    })

    revalidatePath("/dashboard/cases")
    return { ok: true, data: { caseId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/**
 * Patient grants the case's chosen doctor access to the case and its currently
 * finalized documents. Creates a GRANTED consent + per-document grants.
 */
export async function grantCaseConsent(
  caseId: string,
  options?: { expiresInDays?: number },
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CONSENT_GRANT)

    const caseRow = (
      await db
        .select({
          id: aestheticCase.id,
          patientUserId: aestheticCase.patientUserId,
          doctorId: aestheticCase.doctorId,
          status: aestheticCase.status,
        })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, caseId))
        .limit(1)
    )[0]
    if (!caseRow) throw new AppError("NOT_FOUND")
    if (caseRow.patientUserId !== user.id) throw forbidden()
    if (!caseRow.doctorId) throw validation("اختر طبيبًا للحالة أولًا.")

    const doctor = (
      await db
        .select({ userId: doctorProfile.userId })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, caseRow.doctorId))
        .limit(1)
    )[0]
    if (!doctor) throw validation("الطبيب غير موجود.")

    const expiresAt = options?.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 86400_000)
      : null

    await db.transaction(async (tx) => {
      // reuse an existing active consent or create one
      const existing = (
        await tx
          .select({ id: consent.id })
          .from(consent)
          .where(
            and(
              eq(consent.caseId, caseId),
              eq(consent.granteeUserId, doctor.userId),
              eq(consent.status, "GRANTED"),
            ),
          )
          .limit(1)
      )[0]

      let consentId = existing?.id
      if (!consentId) {
        const ins = await tx
          .insert(consent)
          .values({
            caseId,
            patientUserId: user.id,
            granteeUserId: doctor.userId,
            purpose: "consultation_review",
            status: "GRANTED",
            expiresAt,
          })
          .returning({ id: consent.id })
        consentId = ins[0].id
      }

      // grant access to all finalized documents of this case
      const docs = await tx
        .select({ id: medicalDocument.id })
        .from(medicalDocument)
        .where(
          and(
            eq(medicalDocument.caseId, caseId),
            eq(medicalDocument.finalized, true),
            isNull(medicalDocument.deletedAt),
          ),
        )
      for (const d of docs) {
        await tx
          .insert(documentAccessGrant)
          .values({
            documentId: d.id,
            consentId,
            granteeUserId: doctor.userId,
            grantedBy: user.id,
          })
          .onConflictDoNothing()
      }

      if (caseRow.status === "SUBMITTED") {
        await tx
          .update(aestheticCase)
          .set({ status: "SHARED_WITH_PROVIDER", updatedBy: user.id })
          .where(eq(aestheticCase.id, caseId))
        await tx.insert(caseStatusHistory).values({
          caseId,
          fromStatus: "SUBMITTED",
          toStatus: "SHARED_WITH_PROVIDER",
          changedBy: user.id,
        })
      }

      const meta = await requestMeta()
      await writeAudit(
        {
          action: "consent.grant",
          actorUserId: user.id,
          entityType: "consent",
          entityId: consentId,
          metadata: { caseId, granteeUserId: doctor.userId, documents: docs.length },
          ...meta,
        },
        tx,
      )
    })

    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function revokeCaseConsent(caseId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CONSENT_REVOKE)
    if (!(await canAccessCase(user.id, caseId))) throw forbidden()

    const caseRow = (
      await db
        .select({ patientUserId: aestheticCase.patientUserId })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, caseId))
        .limit(1)
    )[0]
    if (!caseRow || caseRow.patientUserId !== user.id) throw forbidden()

    await db.transaction(async (tx) => {
      const consents = await tx
        .select({ id: consent.id })
        .from(consent)
        .where(and(eq(consent.caseId, caseId), eq(consent.status, "GRANTED")))

      for (const c of consents) {
        await tx
          .update(consent)
          .set({ status: "REVOKED", revokedAt: new Date() })
          .where(eq(consent.id, c.id))
        await tx
          .update(documentAccessGrant)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(documentAccessGrant.consentId, c.id),
              isNull(documentAccessGrant.revokedAt),
            ),
          )
      }
      const meta = await requestMeta()
      await writeAudit(
        {
          action: "consent.revoke",
          actorUserId: user.id,
          entityType: "aesthetic_case",
          entityId: caseId,
          metadata: { revoked: consents.length },
          ...meta,
        },
        tx,
      )
    })

    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
