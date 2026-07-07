"use server"

import { revalidatePath } from "next/cache"
import { and, count, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { user as userT, userRole, role as roleT, session as sessionT } from "@/lib/db/schema"
import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { isEmailConfigured } from "@/lib/env"

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
})

/** Admin edits a user's own profile fields — name and phone only. Email and
 * password stay self-service (Better Auth owns those flows). */
export async function updateUserAction(input: {
  userId: string
  name: string
  phone?: string
}): Promise<ActionResult> {
  const actor = await requirePermissionOrThrow(PERMISSIONS.USER_READ_ANY)
  const parsed = UpdateUserSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }
  }
  const { userId, name, phone } = parsed.data

  const [updated] = await db
    .update(userT)
    .set({ name, phone: phone ?? null, updatedAt: new Date() })
    .where(eq(userT.id, userId))
    .returning({ id: userT.id })
  if (!updated) return { status: "error", message: "المستخدم غير موجود" }

  const meta = await requestMeta()
  await writeAudit({
    action: "user.update",
    actorUserId: actor.id,
    entityType: "user",
    entityId: userId,
    metadata: { name, phone: phone ?? null },
    ...meta,
  })

  revalidatePath("/admin/users")
  return { status: "ok", message: "تم تحديث بيانات المستخدم." }
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
