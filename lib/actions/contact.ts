"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { contactMessage } from "@/lib/db/schema"
import { verifyRecaptcha } from "@/lib/security/recaptcha"
import { writeAudit, requestMeta } from "@/lib/audit"
import { toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

const schema = z.object({
  name: z.string().min(2, "الاسم مطلوب").max(120),
  email: z.email("بريد إلكتروني غير صحيح"),
  phone: z.string().max(40).optional(),
  subject: z.string().min(2, "الموضوع مطلوب").max(160),
  message: z.string().min(10, "اكتب رسالة أوضح من فضلك").max(4000),
  recaptchaToken: z.string().optional(),
})

export async function submitContactMessage(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    }
    const data = parsed.data

    const captcha = await verifyRecaptcha(data.recaptchaToken, "contact")
    if (!captcha.success) {
      throw validation("تعذّر التحقق من أنك لست روبوتًا، حاول مرة أخرى.")
    }

    const inserted = await db
      .insert(contactMessage)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
      })
      .returning({ id: contactMessage.id })

    const meta = await requestMeta()
    await writeAudit({
      action: "contact.submit",
      entityType: "contact_message",
      entityId: inserted[0].id,
      ...meta,
    })

    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
