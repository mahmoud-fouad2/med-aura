"use server"

import { revalidatePath } from "next/cache"
import { and, count, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { user as userT, userRole, role as roleT } from "@/lib/db/schema"
import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"

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
