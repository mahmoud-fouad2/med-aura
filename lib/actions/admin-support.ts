"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { contactMessage } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { sendEmail } from "@/lib/email"
import { isEmailConfigured } from "@/lib/env"
import { textToSafeHtml } from "@/lib/html"
import { AppError, toSafeError, validation, notConfigured } from "@/lib/errors"
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

const replySchema = z.object({
  id: z.string().min(1),
  body: z.string().min(3, "اكتب ردًّا قبل الإرسال.").max(5000),
})

/**
 * Sends a real reply to the sender's own email — contact-form submitters
 * aren't necessarily Med Aura accounts, so there's no in-app inbox to write
 * a reply into; email is the only channel that reaches them. Falls back to
 * an honest error (not a fake "sent" toast) when no email provider is
 * configured — the drawer's plain mailto link stays as the manual fallback.
 */
export async function replyToContactMessageAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SUPPORT_MANAGE)

    const parsed = replySchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const { id, body } = parsed.data

    if (!isEmailConfigured())
      throw notConfigured("خدمة البريد الإلكتروني غير مفعّلة على الخادم — استخدم رابط الرد المباشر بدلًا من ذلك.")

    const existing = (
      await db
        .select({ id: contactMessage.id, email: contactMessage.email, subject: contactMessage.subject })
        .from(contactMessage)
        .where(eq(contactMessage.id, id))
        .limit(1)
    )[0]
    if (!existing) throw new AppError("NOT_FOUND")

    await sendEmail({
      to: existing.email,
      subject: `Re: ${existing.subject}`,
      html: `<div dir="auto">${textToSafeHtml(body)}</div>`,
      text: body,
    })

    await db
      .update(contactMessage)
      .set({ status: "read", repliedAt: new Date(), repliedBy: user.id, handledBy: user.id, updatedAt: new Date() })
      .where(eq(contactMessage.id, id))

    const meta = await requestMeta()
    await writeAudit({
      action: "contact_message.replied",
      actorUserId: user.id,
      entityType: "contact_message",
      entityId: id,
      metadata: { bodyPreview: body.slice(0, 200) },
      ...meta,
    })

    revalidatePath("/admin/messages")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
