"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { doctorProfile, doctorProcedure, availabilityRule } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"
import { isIanaTimezone } from "@/lib/geo"
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
  timezone: z.string().trim().refine(isIanaTimezone, "المنطقة الزمنية غير صحيحة"),
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
        timezone: data.timezone,
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

// --- Self-service (the doctor managing their own practice) ---------------
// Ownership — the row's userId matches the caller's session — is the
// authorization here, not an RBAC permission like the admin actions above.
// The doctorId is always resolved server-side from the session, never
// accepted from the caller, so there's no way to target another doctor's row.

const updateMyPracticeSchema = z.object({
  consultationFee: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3),
  offersVideo: z.boolean(),
  offersInPerson: z.boolean(),
  bio: z.string().trim().max(2000).optional(),
  qualifications: z.array(z.string().trim().min(2).max(180)).max(20).optional(),
  certifications: z.array(z.string().trim().min(2).max(180)).max(20).optional(),
  fellowships: z.array(z.string().trim().min(2).max(180)).max(20).optional(),
  memberships: z.array(z.string().trim().min(2).max(180)).max(20).optional(),
  timezone: z.string().trim().refine(isIanaTimezone, "المنطقة الزمنية غير صحيحة").optional(),
})

/** A doctor updating their own price/currency/consultation types. */
export async function updateMyPracticeAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = updateMyPracticeSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data
    if (!data.offersVideo && !data.offersInPerson) {
      throw validation("اختر نوع استشارة واحدًا على الأقل.")
    }

    const existing = (
      await db.select({ id: doctorProfile.id }).from(doctorProfile).where(eq(doctorProfile.userId, user.id)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")

    await db
      .update(doctorProfile)
      .set({
        consultationFee: data.consultationFee != null ? String(data.consultationFee) : null,
        currency: data.currency,
        offersVideo: data.offersVideo,
        offersInPerson: data.offersInPerson,
        ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
        ...(data.qualifications !== undefined ? { qualifications: data.qualifications } : {}),
        ...(data.certifications !== undefined ? { certifications: data.certifications } : {}),
        ...(data.fellowships !== undefined ? { fellowships: data.fellowships } : {}),
        ...(data.memberships !== undefined ? { memberships: data.memberships } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfile.id, existing.id))

    const meta = await requestMeta()
    await writeAudit({
      action: "doctor.self.update",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: existing.id,
      ...meta,
    })

    revalidatePath("/doctors")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const toggleMyProcedureSchema = z.object({ procedureId: z.string().min(1), assign: z.boolean() })

/** Self-service equivalent of toggleDoctorProcedureAction above. */
export async function toggleMyProcedureAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = toggleMyProcedureSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { procedureId, assign } = parsed.data

    const existing = (
      await db.select({ id: doctorProfile.id }).from(doctorProfile).where(eq(doctorProfile.userId, user.id)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")

    if (assign) {
      await db.insert(doctorProcedure).values({ doctorId: existing.id, procedureId }).onConflictDoNothing()
    } else {
      await db
        .delete(doctorProcedure)
        .where(and(eq(doctorProcedure.doctorId, existing.id), eq(doctorProcedure.procedureId, procedureId)))
    }

    const meta = await requestMeta()
    await writeAudit({
      action: assign ? "doctor.procedure.self_assign" : "doctor.procedure.self_unassign",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: existing.id,
      metadata: { procedureId },
      ...meta,
    })

    revalidatePath("/doctors")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Resolves the calling doctor's own doctorProfile id, or throws NOT_FOUND — used by every
 *  self-service availability action below so a rule id can never be targeted across accounts. */
async function requireMyDoctorId(userId: string): Promise<string> {
  const existing = (
    await db.select({ id: doctorProfile.id }).from(doctorProfile).where(eq(doctorProfile.userId, userId)).limit(1)
  )[0]
  if (!existing) throw new AppError("NOT_FOUND")
  return existing.id
}

/** Resolves the caller's doctorId and confirms they own the given availability
 *  rule — the two lookups are independent until compared, so they run in
 *  parallel. Throws NOT_FOUND either way (unknown doctor, unknown rule, or a
 *  rule that belongs to someone else all look the same to the caller). */
async function requireOwnedAvailabilityRule(ruleId: string, userId: string): Promise<string> {
  const [doctorId, rule] = await Promise.all([
    requireMyDoctorId(userId),
    db
      .select({ id: availabilityRule.id, doctorId: availabilityRule.doctorId })
      .from(availabilityRule)
      .where(eq(availabilityRule.id, ruleId))
      .limit(1)
      .then((rows) => rows[0]),
  ])
  if (!rule || rule.doctorId !== doctorId) throw new AppError("NOT_FOUND")
  return doctorId
}

/** A doctor's own weekly availability rules, for the self-service editor. */
export async function getMyAvailabilityAction(): Promise<
  { status: "ok"; rules: AvailabilityRuleRow[] } | { status: "error"; message: string }
> {
  try {
    const user = await requireUser()
    const doctorId = await requireMyDoctorId(user.id)
    const rules = await listAvailabilityForDoctor(doctorId)
    return { status: "ok", rules }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/

const upsertAvailabilityRuleSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(timeRe, "وقت البداية غير صحيح"),
  endTime: z.string().regex(timeRe, "وقت النهاية غير صحيح"),
  slotMinutes: z.coerce.number().int().min(5).max(240),
  type: z.enum(["VIDEO_CONSULTATION", "IN_PERSON_CONSULTATION"]),
  active: z.boolean(),
})

/** Create (no id) or update (id present) one weekly availability rule. */
export async function upsertMyAvailabilityRuleAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = upsertAvailabilityRuleSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data
    if (data.startTime >= data.endTime) {
      throw validation("وقت النهاية يجب أن يكون بعد وقت البداية.")
    }

    const doctorId = data.id
      ? await requireOwnedAvailabilityRule(data.id, user.id)
      : await requireMyDoctorId(user.id)

    if (data.id) {
      await db
        .update(availabilityRule)
        .set({
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          slotMinutes: data.slotMinutes,
          type: data.type,
          active: data.active,
          updatedAt: new Date(),
        })
        .where(eq(availabilityRule.id, data.id))
    } else {
      await db.insert(availabilityRule).values({
        doctorId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotMinutes: data.slotMinutes,
        type: data.type,
        active: data.active,
      })
    }

    const meta = await requestMeta()
    await writeAudit({
      action: data.id ? "doctor.availability.self_update" : "doctor.availability.self_create",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: doctorId,
      metadata: { dayOfWeek: data.dayOfWeek, startTime: data.startTime, endTime: data.endTime, type: data.type },
      ...meta,
    })

    revalidatePath("/dashboard/doctor/availability")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const deleteMyAvailabilityRuleSchema = z.object({ id: z.string().min(1) })

export async function deleteMyAvailabilityRuleAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = deleteMyAvailabilityRuleSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { id } = parsed.data

    const doctorId = await requireOwnedAvailabilityRule(id, user.id)
    await db.delete(availabilityRule).where(eq(availabilityRule.id, id))

    const meta = await requestMeta()
    await writeAudit({
      action: "doctor.availability.self_delete",
      actorUserId: user.id,
      entityType: "doctor_profile",
      entityId: doctorId,
      metadata: { ruleId: id },
      ...meta,
    })

    revalidatePath("/dashboard/doctor/availability")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
