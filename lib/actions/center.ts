"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { center } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS, canAccessCenter, resolveUserCenterIds } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"
import { listDoctorsByCenter, getCenterForAdmin, type CenterDoctorRow, type CenterFull } from "@/lib/data/admin-directory"
import { listActivityForEntityIds, type ActivityRow } from "@/lib/data/admin-activity"
import { buildObjectKey, getUploadUrl, isR2Configured } from "@/lib/storage/r2"

const MEDIA_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_MEDIA_BYTES = 8 * 1024 * 1024

const updateCenterSchema = z.object({
  centerId: z.string().min(1),
  legalName: z.string().trim().min(3, "الاسم القانوني مطلوب").max(200),
  name: z.string().trim().min(3, "الاسم التجاري مطلوب").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  country: z.string().trim().min(2, "الدولة مطلوبة"),
  city: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(30).optional().or(z.literal("").transform(() => undefined)),
  email: z.email("بريد إلكتروني غير صالح").optional().or(z.literal("").transform(() => undefined)),
  website: z.string().trim().max(300).optional().or(z.literal("").transform(() => undefined)),
  languages: z.array(z.string().trim().min(1)).max(20),
  platformCommissionRate: z.coerce.number().min(0).max(100).optional(),
})

/** Full profile edit — the fields collected at application time, editable afterwards by compliance/ops. */
export async function updateCenterAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)

    const parsed = updateCenterSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const existing = (
      await db.select({ id: center.id }).from(center).where(eq(center.id, data.centerId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")

    await db
      .update(center)
      .set({
        legalName: data.legalName,
        name: data.name,
        description: data.description ?? null,
        country: data.country,
        city: data.city ?? null,
        address: data.address ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        languages: data.languages,
        platformCommissionRate: data.platformCommissionRate != null ? String(data.platformCommissionRate) : "15.00",
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(center.id, data.centerId))

    const meta = await requestMeta()
    await writeAudit({
      action: "center.update",
      actorUserId: user.id,
      entityType: "center",
      entityId: data.centerId,
      metadata: { name: data.name },
      ...meta,
    })

    revalidatePath("/admin/centers")
    revalidatePath(`/centers/${data.centerId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const setStatusSchema = z.object({
  centerId: z.string().min(1),
  status: z.enum(["approved", "suspended"]),
})

/**
 * Suspend / reactivate an already-approved center. Gated by PROVIDER_APPROVE
 * (the stronger permission also used for application decisions) since this
 * takes a live center off the platform, not just editing its profile.
 * Suspending force-unpublishes it; reactivating does not auto-republish —
 * an operator re-checks visibility deliberately via the publish toggle.
 */
export async function setCenterStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_APPROVE)

    const parsed = setStatusSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { centerId, status } = parsed.data

    const existing = (
      await db.select({ id: center.id, status: center.status }).from(center).where(eq(center.id, centerId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")
    if (!["approved", "suspended"].includes(existing.status)) {
      throw new AppError("CONFLICT", {
        userMessage: "لا يمكن تغيير الحالة إلا لمركز معتمد أو موقوف — الطلبات المعلّقة تُدار من قائمة الانضمام.",
      })
    }

    await db
      .update(center)
      .set({
        status,
        ...(status === "suspended" ? { published: false } : {}),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(center.id, centerId))

    const meta = await requestMeta()
    await writeAudit({
      action: "center.status.update",
      actorUserId: user.id,
      entityType: "center",
      entityId: centerId,
      metadata: { status },
      ...meta,
    })

    revalidatePath("/admin/centers")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const setPublishedSchema = z.object({ centerId: z.string().min(1), published: z.boolean() })

export async function setCenterPublishedAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)

    const parsed = setPublishedSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { centerId, published } = parsed.data

    const existing = (
      await db.select({ id: center.id, status: center.status }).from(center).where(eq(center.id, centerId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")
    if (published && existing.status !== "approved") {
      throw new AppError("CONFLICT", { userMessage: "لا يمكن إظهار مركز غير معتمد." })
    }

    await db
      .update(center)
      .set({ published, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(center.id, centerId))

    const meta = await requestMeta()
    await writeAudit({
      action: "center.published.update",
      actorUserId: user.id,
      entityType: "center",
      entityId: centerId,
      metadata: { published },
      ...meta,
    })

    revalidatePath("/admin/centers")
    revalidatePath("/centers")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Full record for the center drawer's Edit tab — fetched on-demand so the list query stays lean. */
export async function getCenterForEditAction(
  centerId: string,
): Promise<{ status: "ok"; center: CenterFull } | { status: "error"; message: string }> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)
  const center = await getCenterForAdmin(centerId)
  if (!center) return { status: "error", message: "المركز غير موجود." }
  return { status: "ok", center }
}

/** Read-only doctor roster for the center drawer's Doctors tab. */
export async function getCenterDoctorsAction(
  centerId: string,
): Promise<{ status: "ok"; doctors: CenterDoctorRow[] } | { status: "error"; message: string }> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)
  const doctors = await listDoctorsByCenter(centerId)
  return { status: "ok", doctors }
}

/** Audit trail for the center drawer's Activity tab, same shape as the Users one. */
export async function getCenterActivityAction(
  centerId: string,
): Promise<{ status: "ok"; entries: ActivityRow[] } | { status: "error"; message: string }> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.AUDIT_READ)
  const entries = await listActivityForEntityIds([centerId], 30)
  return { status: "ok", entries }
}

export type MyCenterData = {
  id: string
  name: string
  description: string | null
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  languages: string[]
  logoKey: string | null
  coverKey: string | null
  published: boolean
  status: string
}

/**
 * Center owner/staff's own center — "tell us more about your center", the
 * self-service counterpart to updateCenterAction (which stays PROVIDER_REVIEW
 * / compliance-only, since it also edits legalName/country/commission).
 * Ownership is the authorization: any center this account belongs to
 * (resolveUserCenterIds), same model as a doctor's own doctorProfile.
 */
export async function getMyCenterAction(): Promise<
  { status: "ok"; center: MyCenterData } | { status: "error"; message: string }
> {
  const user = await requireUser()
  const centerIds = await resolveUserCenterIds(user.id)
  if (centerIds.length === 0) return { status: "error", message: "لا يوجد مركز مرتبط بحسابك." }

  const row = (
    await db
      .select({
        id: center.id,
        name: center.name,
        description: center.description,
        city: center.city,
        address: center.address,
        phone: center.phone,
        email: center.email,
        website: center.website,
        languages: center.languages,
        logoKey: center.logoKey,
        coverKey: center.coverKey,
        published: center.published,
        status: center.status,
      })
      .from(center)
      .where(eq(center.id, centerIds[0]))
      .limit(1)
  )[0]
  if (!row) return { status: "error", message: "المركز غير موجود." }
  return { status: "ok", center: row }
}

const updateMyCenterSchema = z.object({
  description: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(30).optional().or(z.literal("").transform(() => undefined)),
  email: z.email("بريد إلكتروني غير صالح").optional().or(z.literal("").transform(() => undefined)),
  website: z.string().trim().max(300).optional().or(z.literal("").transform(() => undefined)),
  languages: z.array(z.string().trim().min(1)).max(20),
})

/** Self-service equivalent of updateCenterAction — description/contact/languages
 *  only, never legalName/country/commission (those stay compliance-controlled). */
export async function updateMyCenterAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const centerIds = await resolveUserCenterIds(user.id)
    if (centerIds.length === 0) throw new AppError("NOT_FOUND")
    const centerId = centerIds[0]

    const parsed = updateMyCenterSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    await db
      .update(center)
      .set({
        description: data.description ?? null,
        city: data.city ?? null,
        address: data.address ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        languages: data.languages,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(center.id, centerId))

    const meta = await requestMeta()
    await writeAudit({
      action: "center.self.update",
      actorUserId: user.id,
      entityType: "center",
      entityId: centerId,
      ...meta,
    })

    revalidatePath("/centers")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const presignCenterMediaSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

export type CenterMediaUploadResult =
  | { ok: true; uploadUrl: string; objectKey: string }
  | { ok: false; error: string }

/** Step 1: a presigned upload slot, namespaced under the caller's own center. */
export async function getCenterMediaUploadUrlAction(
  input: z.infer<typeof presignCenterMediaSchema>,
): Promise<CenterMediaUploadResult> {
  try {
    const user = await requireUser()
    if (!isR2Configured()) return { ok: false, error: "خدمة رفع الصور غير مفعّلة حاليًا." }

    const centerIds = await resolveUserCenterIds(user.id)
    if (centerIds.length === 0) return { ok: false, error: "لا يوجد مركز مرتبط بحسابك." }
    const centerId = centerIds[0]
    if (!(await canAccessCenter(user.id, centerId))) return { ok: false, error: "غير مصرّح بهذه العملية." }

    const parsed = presignCenterMediaSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "بيانات الصورة غير صالحة." }
    const { fileName, contentType, sizeBytes } = parsed.data

    if (!MEDIA_MIME.has(contentType)) {
      return { ok: false, error: "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP." }
    }
    if (sizeBytes > MAX_MEDIA_BYTES) {
      return { ok: false, error: "حجم الصورة يتجاوز الحد المسموح." }
    }

    const objectKey = buildObjectKey(`centers/${centerId}`, fileName)
    const uploadUrl = await getUploadUrl(objectKey, contentType)
    return { ok: true, uploadUrl, objectKey }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage }
  }
}

const finalizeCenterMediaSchema = z.object({
  field: z.enum(["logo", "cover"]),
  objectKey: z.string().min(1),
})

/** Confirms a logo/cover upload (presigned via the shared avatar action's
 *  object-key pattern, just under a centers/ namespace) and points the
 *  caller's own center at it — ownership via canAccessCenter, never another
 *  center's media. */
export async function finalizeCenterMediaAction(
  input: z.infer<typeof finalizeCenterMediaSchema>,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = finalizeCenterMediaSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { field, objectKey } = parsed.data

    const centerIds = await resolveUserCenterIds(user.id)
    if (centerIds.length === 0) throw new AppError("NOT_FOUND")
    const centerId = centerIds[0]
    if (!(await canAccessCenter(user.id, centerId))) throw new AppError("FORBIDDEN")
    if (!objectKey.startsWith(`centers/${centerId}/`)) throw new AppError("FORBIDDEN")

    await db
      .update(center)
      .set({
        [field === "logo" ? "logoKey" : "coverKey"]: objectKey,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(center.id, centerId))

    const meta = await requestMeta()
    await writeAudit({
      action: "center.media.updated",
      actorUserId: user.id,
      entityType: "center",
      entityId: centerId,
      metadata: { field },
      ...meta,
    })

    revalidatePath("/centers")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
