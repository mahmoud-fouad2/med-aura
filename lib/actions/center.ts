"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { center } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"
import { listDoctorsByCenter, getCenterForAdmin, type CenterDoctorRow, type CenterFull } from "@/lib/data/admin-directory"
import { listActivityForEntityIds, type ActivityRow } from "@/lib/data/admin-activity"

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
