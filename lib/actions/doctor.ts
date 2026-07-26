"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { doctorProfile, doctorProcedure } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"
import {
  getDoctorForAdmin,
  listDoctorProcedureOptions,
  getDoctorLicense,
  listAvailabilityForDoctor,
  type DoctorFull,
  type DoctorProcedureOption,
  type DoctorLicenseInfo,
  type AvailabilityRuleRow,
} from "@/lib/data/admin-directory"
import { listActivityForEntityIds, type ActivityRow } from "@/lib/data/admin-activity"

const updateDoctorSchema = z.object({
  doctorId: z.string().min(1),
  name: z.string().trim().min(3, "الاسم مطلوب").max(200),
  title: z.string().trim().max(160).optional().or(z.literal("").transform(() => undefined)),
  bio: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  country: z.string().trim().min(2, "الدولة مطلوبة"),
  city: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  languages: z.array(z.string().trim().min(1)).max(20),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  consultationFee: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3),
  offersVideo: z.boolean(),
  offersInPerson: z.boolean(),
  centerId: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
})

export async function updateDoctorAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)

    const parsed = updateDoctorSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const existing = (
      await db.select({ id: doctorProfile.id }).from(doctorProfile).where(eq(doctorProfile.id, data.doctorId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")

    await db
      .update(doctorProfile)
      .set({
        name: data.name,
        title: data.title ?? null,
        bio: data.bio ?? null,
        country: data.country,
        city: data.city ?? null,
        languages: data.languages,
        yearsExperience: data.yearsExperience,
        consultationFee: data.consultationFee != null ? String(data.consultationFee) : null,
        currency: data.currency,
        offersVideo: data.offersVideo,
        offersInPerson: data.offersInPerson,
        centerId: data.centerId ?? null,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfile.id, data.doctorId))

    const meta = await requestMeta()
    await writeAudit({
      action: "doctor.update",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: data.doctorId,
      metadata: { name: data.name },
      ...meta,
    })

    revalidatePath("/admin/doctors")
    revalidatePath("/admin/centers")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const setStatusSchema = z.object({ doctorId: z.string().min(1), status: z.enum(["approved", "suspended"]) })

/** Suspend / reactivate an already-approved doctor — same shape as setCenterStatusAction. */
export async function setDoctorStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_APPROVE)

    const parsed = setStatusSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { doctorId, status } = parsed.data

    const existing = (
      await db.select({ id: doctorProfile.id, status: doctorProfile.status }).from(doctorProfile).where(eq(doctorProfile.id, doctorId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")
    if (!["approved", "suspended"].includes(existing.status)) {
      throw new AppError("CONFLICT", {
        userMessage: "لا يمكن تغيير الحالة إلا لطبيب معتمد أو موقوف — الطلبات المعلّقة تُدار من قائمة الانضمام.",
      })
    }

    await db
      .update(doctorProfile)
      .set({
        status,
        ...(status === "suspended" ? { published: false } : {}),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfile.id, doctorId))

    const meta = await requestMeta()
    await writeAudit({
      action: "doctor.status.update",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: doctorId,
      metadata: { status },
      ...meta,
    })

    revalidatePath("/admin/doctors")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const setPublishedSchema = z.object({ doctorId: z.string().min(1), published: z.boolean() })

export async function setDoctorPublishedAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)

    const parsed = setPublishedSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { doctorId, published } = parsed.data

    const existing = (
      await db.select({ id: doctorProfile.id, status: doctorProfile.status }).from(doctorProfile).where(eq(doctorProfile.id, doctorId)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")
    if (published && existing.status !== "approved") {
      throw new AppError("CONFLICT", { userMessage: "لا يمكن إظهار طبيب غير معتمد." })
    }

    await db
      .update(doctorProfile)
      .set({ published, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(doctorProfile.id, doctorId))

    const meta = await requestMeta()
    await writeAudit({
      action: "doctor.published.update",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: doctorId,
      metadata: { published },
      ...meta,
    })

    revalidatePath("/admin/doctors")
    revalidatePath("/doctors")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const toggleProcedureSchema = z.object({
  doctorId: z.string().min(1),
  procedureId: z.string().min(1),
  assign: z.boolean(),
})

/** Assign/unassign a procedure this doctor offers — mirrors the role-manager's grant/revoke toggle. */
export async function toggleDoctorProcedureAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)

    const parsed = toggleProcedureSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { doctorId, procedureId, assign } = parsed.data

    if (assign) {
      await db.insert(doctorProcedure).values({ doctorId, procedureId }).onConflictDoNothing()
    } else {
      await db
        .delete(doctorProcedure)
        .where(and(eq(doctorProcedure.doctorId, doctorId), eq(doctorProcedure.procedureId, procedureId)))
    }

    const meta = await requestMeta()
    await writeAudit({
      action: assign ? "doctor.procedure.assign" : "doctor.procedure.unassign",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: doctorId,
      metadata: { procedureId },
      ...meta,
    })

    revalidatePath("/admin/doctors")
    revalidatePath(`/doctors`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Full record for the doctor drawer's Edit tab. */
export async function getDoctorForEditAction(
  doctorId: string,
): Promise<{ status: "ok"; doctor: DoctorFull } | { status: "error"; message: string }> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)
  const doctor = await getDoctorForAdmin(doctorId)
  if (!doctor) return { status: "error", message: "الطبيب غير موجود." }
  return { status: "ok", doctor }
}

/** Procedure catalog + this doctor's current assignment, for the Procedures tab. */
export async function getDoctorProceduresAction(
  doctorId: string,
): Promise<{ status: "ok"; procedures: DoctorProcedureOption[] } | { status: "error"; message: string }> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)
  const procedures = await listDoctorProcedureOptions(doctorId)
  return { status: "ok", procedures }
}

/** License + availability snapshot for the Overview tab (both read-only). */
export async function getDoctorOverviewExtrasAction(doctorId: string): Promise<
  | { status: "ok"; license: DoctorLicenseInfo | null; availability: AvailabilityRuleRow[] }
  | { status: "error"; message: string }
> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.PROVIDER_REVIEW)
  const [license, availability] = await Promise.all([
    getDoctorLicense(doctorId),
    listAvailabilityForDoctor(doctorId),
  ])
  return { status: "ok", license, availability }
}

export async function getDoctorActivityAction(
  doctorId: string,
): Promise<{ status: "ok"; entries: ActivityRow[] } | { status: "error"; message: string }> {
  const user = await requireUser()
  await requirePermission(user.id, PERMISSIONS.AUDIT_READ)
  const entries = await listActivityForEntityIds([doctorId], 30)
  return { status: "ok", entries }
}
