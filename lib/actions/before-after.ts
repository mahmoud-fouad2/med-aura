"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  beforeAfterCase,
  beforeAfterMedia,
  doctorProfile,
  centerStaff,
  center,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, hasPermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string }

const CaseSchema = z.object({
  procedureId: z.string().min(1, "الإجراء مطلوب"),
  doctorId: z.string().optional().nullable(),
  centerId: z.string().optional().nullable(),
  titleAr: z.string().min(3).max(160),
  titleEn: z.string().max(160).optional().default(""),
  descriptionAr: z.string().max(2000).optional().default(""),
  descriptionEn: z.string().max(2000).optional().default(""),
  ageRange: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "استخدم صيغة نطاق مثل 25-34")
    .optional()
    .nullable(),
  gender: z.enum(["female", "male", "other"]).optional().nullable(),
  treatmentDate: z.string().optional().nullable(),
  afterCaptureDays: z.coerce.number().int().min(1).max(730).optional().nullable(),
  consentGranted: z.coerce.boolean().default(false),
})

const MediaSchema = z.object({
  caseId: z.string().min(1),
  kind: z.enum(["BEFORE", "AFTER"]),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.coerce.number().int().min(1),
  width: z.coerce.number().int().optional().nullable(),
  height: z.coerce.number().int().optional().nullable(),
  angle: z.string().max(60).optional().nullable(),
})

/**
 * Assert the caller has ownership of the target (doctor or center). A doctor
 * user owns their own profile; a center staff/owner user owns entries linked
 * to their center. Throws FORBIDDEN otherwise.
 */
async function assertOwnership(
  userId: string,
  opts: { doctorId?: string | null; centerId?: string | null },
): Promise<void> {
  if (opts.doctorId) {
    const [doc] = await db
      .select({ userId: doctorProfile.userId })
      .from(doctorProfile)
      .where(eq(doctorProfile.id, opts.doctorId))
      .limit(1)
    if (!doc || doc.userId !== userId) {
      throw new AppError("FORBIDDEN", {
        userMessage: "ليست لديك صلاحية إدارة هذا الطبيب.",
      })
    }
    return
  }
  if (opts.centerId) {
    const [membership] = await db
      .select({ id: centerStaff.id })
      .from(centerStaff)
      .where(
        and(
          eq(centerStaff.userId, userId),
          eq(centerStaff.centerId, opts.centerId),
        ),
      )
      .limit(1)
    if (membership) return
    const [c] = await db
      .select({ ownerId: center.ownerId })
      .from(center)
      .where(eq(center.id, opts.centerId))
      .limit(1)
    if (c && c.ownerId === userId) return
    throw new AppError("FORBIDDEN", {
      userMessage: "ليست لديك صلاحية إدارة هذا المركز.",
    })
  }
  throw validation("يجب ربط الحالة بطبيب أو مركز.")
}

/** Create a Before/After draft. Not yet submitted for moderation. */
export async function createBeforeAfterCase(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.BEFORE_AFTER_WRITE)
    const parsed = CaseSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صالحة")
    }
    const data = parsed.data
    await assertOwnership(user.id, {
      doctorId: data.doctorId,
      centerId: data.centerId,
    })

    const [row] = await db
      .insert(beforeAfterCase)
      .values({
        procedureId: data.procedureId,
        doctorId: data.doctorId ?? null,
        centerId: data.centerId ?? null,
        titleAr: data.titleAr,
        titleEn: data.titleEn || null,
        descriptionAr: data.descriptionAr || null,
        descriptionEn: data.descriptionEn || null,
        ageRange: data.ageRange || null,
        gender: data.gender || null,
        treatmentDate: data.treatmentDate || null,
        afterCaptureDays: data.afterCaptureDays ?? null,
        consentGranted: data.consentGranted,
        consentGrantedAt: data.consentGranted ? new Date() : null,
        status: "DRAFT",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: beforeAfterCase.id })

    const meta = await requestMeta()
    await writeAudit({
      action: "before_after.case.create",
      actorUserId: user.id,
      entityType: "before_after_case",
      entityId: row.id,
      ...meta,
    })

    revalidatePath("/dashboard/portfolio")
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Attach a media file to a draft/submitted case. */
export async function attachBeforeAfterMedia(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.BEFORE_AFTER_WRITE)
    const parsed = MediaSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صالحة")
    }
    const data = parsed.data

    const [c] = await db
      .select({
        id: beforeAfterCase.id,
        doctorId: beforeAfterCase.doctorId,
        centerId: beforeAfterCase.centerId,
        status: beforeAfterCase.status,
      })
      .from(beforeAfterCase)
      .where(eq(beforeAfterCase.id, data.caseId))
      .limit(1)
    if (!c) throw new AppError("NOT_FOUND")
    if (c.status === "APPROVED" || c.status === "ARCHIVED") {
      throw new AppError("CONFLICT", {
        userMessage: "لا يمكن تعديل حالة معتمدة أو مؤرشفة.",
      })
    }
    await assertOwnership(user.id, {
      doctorId: c.doctorId,
      centerId: c.centerId,
    })

    const [row] = await db
      .insert(beforeAfterMedia)
      .values({
        caseId: data.caseId,
        kind: data.kind,
        objectKey: data.objectKey,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes,
        width: data.width ?? null,
        height: data.height ?? null,
        angle: data.angle || null,
      })
      .returning({ id: beforeAfterMedia.id })

    return { ok: true, data: { id: row.id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Submit a case for moderation. Requires consent + at least one media pair. */
export async function submitBeforeAfterCase(
  caseId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.BEFORE_AFTER_WRITE)

    const [c] = await db
      .select()
      .from(beforeAfterCase)
      .where(eq(beforeAfterCase.id, caseId))
      .limit(1)
    if (!c) throw new AppError("NOT_FOUND")
    if (c.status !== "DRAFT" && c.status !== "REJECTED") {
      throw new AppError("CONFLICT", {
        userMessage: "تم إرسال هذه الحالة للمراجعة بالفعل.",
      })
    }
    await assertOwnership(user.id, {
      doctorId: c.doctorId,
      centerId: c.centerId,
    })
    if (!c.consentGranted) {
      throw validation("لا يمكن الإرسال قبل تأكيد وجود موافقة المريض.")
    }

    const media = await db
      .select({ id: beforeAfterMedia.id, kind: beforeAfterMedia.kind })
      .from(beforeAfterMedia)
      .where(eq(beforeAfterMedia.caseId, caseId))
    const hasBefore = media.some((m) => m.kind === "BEFORE")
    const hasAfter = media.some((m) => m.kind === "AFTER")
    if (!hasBefore || !hasAfter) {
      throw validation("مطلوب صورة واحدة على الأقل قبل وأخرى بعد الإجراء.")
    }

    await db
      .update(beforeAfterCase)
      .set({ status: "SUBMITTED", updatedBy: user.id })
      .where(eq(beforeAfterCase.id, caseId))

    const meta = await requestMeta()
    await writeAudit({
      action: "before_after.case.submit",
      actorUserId: user.id,
      entityType: "before_after_case",
      entityId: caseId,
      ...meta,
    })

    revalidatePath("/dashboard/portfolio")
    revalidatePath("/admin/before-after")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Compliance approves. Enforces the consent gate on the server side too. */
export async function moderateApprove(
  caseId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.BEFORE_AFTER_MODERATE)

    const [c] = await db
      .select()
      .from(beforeAfterCase)
      .where(eq(beforeAfterCase.id, caseId))
      .limit(1)
    if (!c) throw new AppError("NOT_FOUND")
    if (c.status !== "SUBMITTED") {
      throw new AppError("CONFLICT", {
        userMessage: "هذه الحالة ليست في قائمة المراجعة.",
      })
    }
    if (!c.consentGranted) {
      throw validation("لا يمكن الاعتماد قبل تأكيد وجود موافقة المريض.")
    }

    await db
      .update(beforeAfterCase)
      .set({
        status: "APPROVED",
        publishedAt: new Date(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
        updatedBy: user.id,
      })
      .where(eq(beforeAfterCase.id, caseId))

    const meta = await requestMeta()
    await writeAudit({
      action: "before_after.case.approve",
      actorUserId: user.id,
      entityType: "before_after_case",
      entityId: caseId,
      ...meta,
    })

    revalidatePath("/admin/before-after")
    revalidatePath("/before-after")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Compliance rejects with a required reason (min 3 chars). */
export async function moderateReject(
  caseId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.BEFORE_AFTER_MODERATE)
    if (!reason || reason.trim().length < 3) {
      throw validation("يرجى إدخال سبب الرفض.")
    }

    const [c] = await db
      .select({ status: beforeAfterCase.status })
      .from(beforeAfterCase)
      .where(eq(beforeAfterCase.id, caseId))
      .limit(1)
    if (!c) throw new AppError("NOT_FOUND")
    if (c.status !== "SUBMITTED") {
      throw new AppError("CONFLICT", {
        userMessage: "هذه الحالة ليست في قائمة المراجعة.",
      })
    }

    await db
      .update(beforeAfterCase)
      .set({
        status: "REJECTED",
        rejectionReason: reason,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(beforeAfterCase.id, caseId))

    const meta = await requestMeta()
    await writeAudit({
      action: "before_after.case.reject",
      actorUserId: user.id,
      entityType: "before_after_case",
      entityId: caseId,
      metadata: { reason },
      ...meta,
    })

    revalidatePath("/admin/before-after")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Owner archives an approved entry (soft delete). Removes from public. */
export async function archiveBeforeAfterCase(
  caseId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()

    const [c] = await db
      .select({
        doctorId: beforeAfterCase.doctorId,
        centerId: beforeAfterCase.centerId,
        status: beforeAfterCase.status,
      })
      .from(beforeAfterCase)
      .where(eq(beforeAfterCase.id, caseId))
      .limit(1)
    if (!c) throw new AppError("NOT_FOUND")
    if (c.status === "ARCHIVED") return { ok: true }

    const canModerate = await hasPermission(
      user.id,
      PERMISSIONS.BEFORE_AFTER_MODERATE,
    )
    if (!canModerate) {
      await assertOwnership(user.id, {
        doctorId: c.doctorId,
        centerId: c.centerId,
      })
    }

    await db
      .update(beforeAfterCase)
      .set({ status: "ARCHIVED", updatedBy: user.id })
      .where(eq(beforeAfterCase.id, caseId))

    const meta = await requestMeta()
    await writeAudit({
      action: "before_after.case.archive",
      actorUserId: user.id,
      entityType: "before_after_case",
      entityId: caseId,
      ...meta,
    })

    revalidatePath("/dashboard/portfolio")
    revalidatePath("/admin/before-after")
    revalidatePath("/before-after")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
