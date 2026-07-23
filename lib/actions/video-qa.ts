"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { isVideoQaEnabled } from "@/lib/env"
import { writeAudit, requestMeta } from "@/lib/audit"
import { toSafeError, validation, notFound, forbidden } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

/**
 * QA-only: mark an existing account as isTest=true so it becomes eligible
 * for the video-QA tool's patient/doctor pickers. Never usable to grant any
 * other capability — isTest changes nothing about permissions or data
 * access, it only unlocks QA-tool eligibility (checked separately, and only
 * while ENABLE_VIDEO_QA_TOOLS=true).
 */
const markSchema = z.object({
  email: z.string().email(),
})

export async function markUserAsTestAccount(
  input: unknown,
): Promise<ActionResult<{ userId: string; name: string; role: string }>> {
  try {
    if (!isVideoQaEnabled()) throw forbidden("أداة اختبار الفيديو غير مفعّلة حاليًا.")
    const admin = await requireUser()
    await requirePermission(admin.id, PERMISSIONS.ADMIN_ACCESS)

    const parsed = markSchema.safeParse(input)
    if (!parsed.success) throw validation("بريد إلكتروني غير صالح.")

    const row = (
      await db
        .select({ id: userTable.id, name: userTable.name, role: userTable.role })
        .from(userTable)
        .where(eq(userTable.email, parsed.data.email))
        .limit(1)
    )[0]
    if (!row) throw notFound("لا يوجد حساب بهذا البريد الإلكتروني.")
    if (row.role !== "patient" && row.role !== "doctor") {
      throw validation("يمكن تحديد حسابات المريض أو الطبيب فقط كحسابات اختبار.")
    }

    await db.update(userTable).set({ isTest: true }).where(eq(userTable.id, row.id))

    const meta = await requestMeta()
    await writeAudit({
      action: "video_qa.account_marked_test",
      actorUserId: admin.id,
      entityType: "user",
      entityId: row.id,
      ...meta,
    })

    revalidatePath("/admin/video-qa")
    return { ok: true, data: { userId: row.id, name: row.name, role: row.role } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
