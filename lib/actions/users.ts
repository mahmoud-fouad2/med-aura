"use server"

import { revalidatePath } from "next/cache"
import { and, count, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { user as userT, userRole, role as roleT, session as sessionT, patientProfile } from "@/lib/db/schema"
import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { isEmailConfigured } from "@/lib/env"
import { listActivityForEntityIds, type ActivityRow } from "@/lib/data/admin-activity"

/**
 * User role management. Guarded by ROLE_ASSIGN (super admin only via the
 * role matrix), validated against the canonical role list, and audit-logged.
 *
 * Two lockout guards: an admin can never strip their own super_admin role,
 * and the platform's last super_admin grant can never be revoked — so the
 * system always keeps at least one account that can manage roles.
 */

export type ActionResult =
  | { status: "ok"; message?: string }
  | { status: "error"; message: string }

const ROLE_KEYS = Object.values(ROLES) as [string, ...string[]]

const ToggleRoleSchema = z.object({
  userId: z.string().min(1),
  roleKey: z.enum(ROLE_KEYS),
  grant: z.boolean(),
})

export async function toggleUserRoleAction(input: {
  userId: string
  roleKey: string
  grant: boolean
}): Promise<ActionResult> {
  const actor = await requirePermissionOrThrow(PERMISSIONS.ROLE_ASSIGN)

  const parsed = ToggleRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", message: "بيانات غير صالحة" }
  }
  const { userId, roleKey, grant } = parsed.data

  const [target] = await db
    .select({ id: userT.id, name: userT.name })
    .from(userT)
    .where(eq(userT.id, userId))
    .limit(1)
  if (!target) return { status: "error", message: "المستخدم غير موجود" }

  const [roleRow] = await db
    .select({ id: roleT.id, nameAr: roleT.nameAr })
    .from(roleT)
    .where(eq(roleT.key, roleKey))
    .limit(1)
  if (!roleRow) return { status: "error", message: "الدور غير معرّف في النظام" }

  if (!grant && roleKey === ROLES.SUPER_ADMIN) {
    if (userId === actor.id) {
      return {
        status: "error",
        message: "لا يمكنك إزالة صلاحية مدير النظام عن حسابك أنت.",
      }
    }
    const [superAdmins] = await db
      .select({ n: count() })
      .from(userRole)
      .innerJoin(roleT, eq(userRole.roleId, roleT.id))
      .where(eq(roleT.key, ROLES.SUPER_ADMIN))
    if ((superAdmins?.n ?? 0) <= 1) {
      return {
        status: "error",
        message: "لا يمكن إزالة آخر مدير نظام — أضف مديرًا آخر أولًا.",
      }
    }
  }

  const meta = await requestMeta()

  if (grant) {
    await db
      .insert(userRole)
      .values({ userId, roleId: roleRow.id, grantedBy: actor.id })
      .onConflictDoNothing()
    await writeAudit({
      action: "user.role.grant",
      actorUserId: actor.id,
      entityType: "user",
      entityId: userId,
      metadata: { roleKey },
      ...meta,
    })
  } else {
    // Platform-wide grant only; center-scoped grants are managed with the center.
    await db
      .delete(userRole)
      .where(
        and(
          eq(userRole.userId, userId),
          eq(userRole.roleId, roleRow.id),
          isNull(userRole.centerId),
        ),
      )
    await writeAudit({
      action: "user.role.revoke",
      actorUserId: actor.id,
      entityType: "user",
      entityId: userId,
      metadata: { roleKey },
      ...meta,
    })
  }

  revalidatePath("/admin/users")
  return {
    status: "ok",
    message: grant
      ? `أُضيف دور «${roleRow.nameAr}» إلى ${target.name}`
      : `أُزيل دور «${roleRow.nameAr}» من ${target.name}`,
  }
}

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  )

const optionalCountryCode = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().length(2, "اختر رمز دولة صالح").optional(),
)

const optionalPhone = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(30).regex(/^\+?[0-9\s-]{6,30}$/, "رقم غير صالح").optional(),
)

const optionalPastDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .refine((v) => {
      const d = new Date(v)
      return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now()
    }, "تاريخ الميلاد غير صالح")
    .optional(),
)

const UpdateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, "الاسم مطلوب").max(160),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[0-9\s-]{6,30}$/, "رقم الهاتف غير صالح")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Only patients have a patient_profile row — the edit form only sends
  // these when editing a patient, gating whether that table gets touched.
  isPatientProfile: z.boolean().optional().default(false),
  dateOfBirth: optionalPastDate,
  nationality: optionalCountryCode,
  residenceCountry: optionalCountryCode,
  city: optionalText(120),
  biologicalSex: z.enum(["male", "female"]).optional(),
  heightCm: z.coerce.number().int().min(30).max(280).optional(),
  weightKg: z.coerce.number().min(1).max(500).optional(),
  emergencyContactName: optionalText(160),
  emergencyContactPhone: optionalPhone,
})

/**
 * Admin edits a user's account fields (name, phone) and — for patients only
 * — the demographic/emergency-contact fields on patient_profile. Email and
 * password stay self-service (Better Auth owns those flows).
 */
export async function updateUserAction(input: {
  userId: string
  name: string
  phone?: string
  isPatientProfile?: boolean
  dateOfBirth?: string
  nationality?: string
  residenceCountry?: string
  city?: string
  biologicalSex?: "male" | "female"
  heightCm?: number
  weightKg?: number
  emergencyContactName?: string
  emergencyContactPhone?: string
}): Promise<ActionResult> {
  const actor = await requirePermissionOrThrow(PERMISSIONS.USER_READ_ANY)
  const parsed = UpdateUserSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }
  }
  const {
    userId,
    name,
    phone,
    isPatientProfile,
    dateOfBirth,
    nationality,
    residenceCountry,
    city,
    biologicalSex,
    heightCm,
    weightKg,
    emergencyContactName,
    emergencyContactPhone,
  } = parsed.data

  const [updated] = await db
    .update(userT)
    .set({ name, phone: phone ?? null, updatedAt: new Date() })
    .where(eq(userT.id, userId))
    .returning({ id: userT.id })
  if (!updated) return { status: "error", message: "المستخدم غير موجود" }

  if (isPatientProfile) {
    const existing = (
      await db
        .select({ id: patientProfile.id })
        .from(patientProfile)
        .where(eq(patientProfile.userId, userId))
        .limit(1)
    )[0]
    const profileValues = {
      dateOfBirth: dateOfBirth ?? null,
      nationality: nationality ?? null,
      residenceCountry: residenceCountry ?? null,
      city: city ?? null,
      biologicalSex: biologicalSex ?? null,
      heightCm: heightCm ?? null,
      weightKg: weightKg != null ? String(weightKg) : null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      updatedAt: new Date(),
    }
    if (existing) {
      await db.update(patientProfile).set(profileValues).where(eq(patientProfile.id, existing.id))
    } else {
      await db.insert(patientProfile).values({ userId, ...profileValues })
    }
  }

  const meta = await requestMeta()
  await writeAudit({
    action: "user.update",
    actorUserId: actor.id,
    entityType: "user",
    entityId: userId,
    metadata: {
      name,
      phone: phone ?? null,
      ...(isPatientProfile ? { dateOfBirth, nationality, residenceCountry, city } : {}),
    },
    ...meta,
  })

  revalidatePath("/admin/users")
  revalidatePath("/admin/patients")
  return { status: "ok", message: "تم تحديث بيانات المستخدم." }
}

export type UserEditData = {
  name: string
  phone: string | null
  dateOfBirth: string | null
  nationality: string | null
  residenceCountry: string | null
  city: string | null
  biologicalSex: "male" | "female" | null
  heightCm: number | null
  weightKg: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
}

/** Full editable record for the admin "تعديل" tab — base account fields plus
 * patient_profile fields (left-joined; doctors/staff have no such row, so
 * these come back null and the caller — which already knows the account's
 * role — decides whether to render/submit that section). */
export async function getUserForEditAction(
  userId: string,
): Promise<{ status: "ok"; user: UserEditData } | { status: "error"; message: string }> {
  await requirePermissionOrThrow(PERMISSIONS.USER_READ_ANY)
  const row = (
    await db
      .select({
        name: userT.name,
        phone: userT.phone,
        dateOfBirth: patientProfile.dateOfBirth,
        nationality: patientProfile.nationality,
        residenceCountry: patientProfile.residenceCountry,
        city: patientProfile.city,
        biologicalSex: patientProfile.biologicalSex,
        heightCm: patientProfile.heightCm,
        weightKg: patientProfile.weightKg,
        emergencyContactName: patientProfile.emergencyContactName,
        emergencyContactPhone: patientProfile.emergencyContactPhone,
      })
      .from(userT)
      .leftJoin(patientProfile, eq(patientProfile.userId, userT.id))
      .where(eq(userT.id, userId))
      .limit(1)
  )[0]
  if (!row) return { status: "error", message: "المستخدم غير موجود" }

  return {
    status: "ok",
    user: { ...row, biologicalSex: row.biologicalSex as "male" | "female" | null },
  }
}

/**
 * Activate/disable a user account. A disabled account is treated as fully
 * signed-out on every next request (enforced in lib/session.ts getCurrentUser),
 * and its live sessions are revoked immediately here so access stops now —
 * not whenever their session cookie would have otherwise expired.
 */
export async function toggleUserStatusAction(input: {
  userId: string
  active: boolean
}): Promise<ActionResult> {
  const actor = await requirePermissionOrThrow(PERMISSIONS.ROLE_ASSIGN)
  const { userId, active } = input

  if (!active && userId === actor.id) {
    return { status: "error", message: "لا يمكنك تعطيل حسابك أنت." }
  }

  const [target] = await db
    .select({ id: userT.id, name: userT.name, status: userT.status })
    .from(userT)
    .where(eq(userT.id, userId))
    .limit(1)
  if (!target) return { status: "error", message: "المستخدم غير موجود" }

  if (!active) {
    const [superAdmins] = await db
      .select({ n: count() })
      .from(userRole)
      .innerJoin(roleT, eq(userRole.roleId, roleT.id))
      .innerJoin(userT, eq(userRole.userId, userT.id))
      .where(and(eq(roleT.key, ROLES.SUPER_ADMIN), eq(userT.status, "active")))
    const targetIsSuperAdmin = await db
      .select({ n: count() })
      .from(userRole)
      .innerJoin(roleT, eq(userRole.roleId, roleT.id))
      .where(and(eq(userRole.userId, userId), eq(roleT.key, ROLES.SUPER_ADMIN)))
    if ((targetIsSuperAdmin[0]?.n ?? 0) > 0 && (superAdmins?.n ?? 0) <= 1) {
      return {
        status: "error",
        message: "لا يمكن تعطيل آخر مدير نظام نشط — فعّل مديرًا آخر أولًا.",
      }
    }
  }

  await db
    .update(userT)
    .set({ status: active ? "active" : "disabled", updatedAt: new Date() })
    .where(eq(userT.id, userId))

  if (!active) {
    await db.delete(sessionT).where(eq(sessionT.userId, userId))
  }

  const meta = await requestMeta()
  await writeAudit({
    action: active ? "user.activate" : "user.disable",
    actorUserId: actor.id,
    entityType: "user",
    entityId: userId,
    ...meta,
  })

  revalidatePath("/admin/users")
  return {
    status: "ok",
    message: active ? `تم تفعيل حساب ${target.name}.` : `تم تعطيل حساب ${target.name} وإنهاء جلساته الحالية.`,
  }
}

/** Force sign-out — revokes every live session for the user immediately. */
export async function revokeUserSessionsAction(userId: string): Promise<ActionResult> {
  const actor = await requirePermissionOrThrow(PERMISSIONS.ROLE_ASSIGN)

  const [target] = await db
    .select({ id: userT.id, name: userT.name })
    .from(userT)
    .where(eq(userT.id, userId))
    .limit(1)
  if (!target) return { status: "error", message: "المستخدم غير موجود" }

  const deleted = await db
    .delete(sessionT)
    .where(eq(sessionT.userId, userId))
    .returning({ id: sessionT.id })

  const meta = await requestMeta()
  await writeAudit({
    action: "user.sessions.revoke",
    actorUserId: actor.id,
    entityType: "user",
    entityId: userId,
    metadata: { revokedCount: deleted.length },
    ...meta,
  })

  revalidatePath("/admin/users")
  return {
    status: "ok",
    message:
      deleted.length > 0
        ? `تم إنهاء ${deleted.length.toLocaleString("ar-SA-u-nu-latn")} جلسة نشطة لـ ${target.name}.`
        : `لا توجد جلسات نشطة لـ ${target.name}.`,
  }
}

/**
 * Admin-triggered password reset — sends the standard reset-password email
 * to the user's own address (never sets/reveals a password directly). Reuses
 * Better Auth's existing self-service flow so behavior stays identical.
 */
export async function adminRequestPasswordResetAction(userId: string): Promise<ActionResult> {
  const actor = await requirePermissionOrThrow(PERMISSIONS.ROLE_ASSIGN)

  const [target] = await db
    .select({ id: userT.id, name: userT.name, email: userT.email })
    .from(userT)
    .where(eq(userT.id, userId))
    .limit(1)
  if (!target) return { status: "error", message: "المستخدم غير موجود" }

  if (!isEmailConfigured()) {
    return {
      status: "error",
      message: "خدمة البريد الإلكتروني غير مفعّلة على المنصة حاليًا — لا يمكن إرسال رابط إعادة التعيين.",
    }
  }

  await auth.api.requestPasswordReset({
    body: { email: target.email, redirectTo: "/reset-password" },
  })

  const meta = await requestMeta()
  await writeAudit({
    action: "user.password_reset.request",
    actorUserId: actor.id,
    entityType: "user",
    entityId: userId,
    ...meta,
  })

  return { status: "ok", message: `أُرسل رابط إعادة تعيين كلمة المرور إلى بريد ${target.name}.` }
}

/**
 * Audit trail for one account, for the user detail drawer's Activity tab.
 * Gated by AUDIT_READ (not USER_READ_ANY) since it's audit data, matching
 * the permission /admin/activity itself requires.
 */
export async function getUserActivityAction(
  userId: string,
): Promise<{ status: "ok"; entries: ActivityRow[] } | { status: "error"; message: string }> {
  await requirePermissionOrThrow(PERMISSIONS.AUDIT_READ)
  const entries = await listActivityForEntityIds([userId], 30)
  return { status: "ok", entries }
}
