"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { contactMessage } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "read", "archived"]),
})

/**
 * Triage a public contact-form submission. `read` is set automatically the
 * first time an agent opens a message (see the page), `archived` is the
 * explicit "done with this" action — both just update the row the public
 * form already writes to (contact_message), no new data model.
 */
export async function setContactMessageStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SUPPORT_MANAGE)

    const parsed = setStatusSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { id, status } = parsed.data

    const existing = (
      await db.select({ id: contactMessage.id }).from(contactMessage).where(eq(contactMessage.id, id)).limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")

    await db
      .update(contactMessage)
      .set({ status, handledBy: user.id, updatedAt: new Date() })
      .where(eq(contactMessage.id, id))

    const meta = await requestMeta()
    await writeAudit({
      action: "contact_message.status_update",
      actorUserId: user.id,
      entityType: "contact_message",
      entityId: id,
      metadata: { status },
      ...meta,
    })

    revalidatePath("/admin/messages")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
