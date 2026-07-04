"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { notificationPreference } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { writeAudit, requestMeta } from "@/lib/audit"
import { channelAvailability } from "@/lib/notifications/channels"

export type PreferencesRow = {
  inAppEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
  smsPhone: string | null
  whatsappPhone: string | null
  mutedEvents: string[]
}

/** Read current preferences with defaults applied for a missing row. */
export async function getPreferencesForCurrentUser(): Promise<PreferencesRow> {
  const user = await requireUser()
  const [row] = await db
    .select()
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, user.id))
    .limit(1)
  if (!row) {
    return {
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      smsPhone: null,
      whatsappPhone: null,
      mutedEvents: [],
    }
  }
  return {
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
    smsEnabled: row.smsEnabled,
    whatsappEnabled: row.whatsappEnabled,
    smsPhone: row.smsPhone,
    whatsappPhone: row.whatsappPhone,
    mutedEvents: row.mutedEvents ?? [],
  }
}

const phoneRe = /^\+?[0-9\s\-()]{6,20}$/

const PreferencesSchema = z.object({
  inAppEnabled: z.coerce.boolean().default(true),
  emailEnabled: z.coerce.boolean().default(true),
  smsEnabled: z.coerce.boolean().default(false),
  whatsappEnabled: z.coerce.boolean().default(false),
  smsPhone: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || phoneRe.test(v), "رقم الهاتف غير صالح")
    .transform((v) => v || null),
  whatsappPhone: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || phoneRe.test(v), "رقم الواتساب غير صالح")
    .transform((v) => v || null),
})

export type ActionResult = { status: "ok" } | { status: "error"; message: string }

function parseFormData(fd: FormData) {
  return {
    inAppEnabled: fd.get("inAppEnabled") === "on",
    emailEnabled: fd.get("emailEnabled") === "on",
    smsEnabled: fd.get("smsEnabled") === "on",
    whatsappEnabled: fd.get("whatsappEnabled") === "on",
    smsPhone: String(fd.get("smsPhone") ?? ""),
    whatsappPhone: String(fd.get("whatsappPhone") ?? ""),
  }
}

/**
 * Save the caller's notification preferences. Requires only that they're
 * signed in — a user can always manage their own delivery channels. Users
 * are prevented from enabling SMS or WhatsApp when the platform-level
 * adapter is not configured (server enforces this, not just the UI).
 */
export async function updatePreferencesAction(
  fd: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = PreferencesSchema.safeParse(parseFormData(fd))
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
    }
  }
  const data = parsed.data
  const avail = channelAvailability()

  // Refuse to turn on a channel the platform cannot deliver on. This keeps
  // the UI honest and matches the "no fake success" rule.
  if (data.smsEnabled && !avail.sms) {
    return {
      status: "error",
      message: "قناة SMS غير مهيأة على المنصة حاليًا.",
    }
  }
  if (data.whatsappEnabled && !avail.whatsapp) {
    return {
      status: "error",
      message: "قناة واتساب غير مهيأة على المنصة حاليًا.",
    }
  }

  await db
    .insert(notificationPreference)
    .values({
      userId: user.id,
      inAppEnabled: data.inAppEnabled,
      emailEnabled: data.emailEnabled,
      smsEnabled: data.smsEnabled,
      whatsappEnabled: data.whatsappEnabled,
      smsPhone: data.smsPhone,
      whatsappPhone: data.whatsappPhone,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationPreference.userId,
      set: {
        inAppEnabled: data.inAppEnabled,
        emailEnabled: data.emailEnabled,
        smsEnabled: data.smsEnabled,
        whatsappEnabled: data.whatsappEnabled,
        smsPhone: data.smsPhone,
        whatsappPhone: data.whatsappPhone,
        updatedAt: new Date(),
      },
    })

  const meta = await requestMeta()
  await writeAudit({
    action: "notification.preferences.update",
    actorUserId: user.id,
    entityType: "notification_preference",
    entityId: user.id,
    metadata: {
      inApp: data.inAppEnabled,
      email: data.emailEnabled,
      sms: data.smsEnabled,
      whatsapp: data.whatsappEnabled,
    },
    ...meta,
  })

  revalidatePath("/dashboard/notifications")
  revalidatePath("/dashboard/notifications/preferences")
  return { status: "ok" }
}
