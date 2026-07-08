"use server"

import { and, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { notification, notificationDelivery, notificationPreference } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { isEmailConfigured } from "@/lib/env"
import { sendEmail } from "@/lib/email"
import { toSafeError, forbidden, AppError } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const n = (
      await db.select({ userId: notification.userId, readAt: notification.readAt }).from(notification).where(eq(notification.id, notificationId)).limit(1)
    )[0]
    if (!n) throw new AppError("NOT_FOUND")
    if (n.userId !== user.id) throw forbidden()
    if (!n.readAt) {
      await db.update(notification).set({ readAt: new Date() }).where(eq(notification.id, notificationId))
    }
    revalidatePath("/dashboard/notifications")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await db
      .update(notification)
      .set({ readAt: new Date() })
      .where(and(eq(notification.userId, user.id), isNull(notification.readAt)))
    revalidatePath("/dashboard/notifications")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

async function setArchived(notificationId: string, archived: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const n = (
      await db
        .select({ userId: notification.userId })
        .from(notification)
        .where(eq(notification.id, notificationId))
        .limit(1)
    )[0]
    if (!n) throw new AppError("NOT_FOUND")
    if (n.userId !== user.id) throw forbidden()
    await db
      .update(notification)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(notification.id, notificationId))
    revalidatePath("/dashboard/notifications")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function archiveNotification(notificationId: string): Promise<ActionResult> {
  return setArchived(notificationId, true)
}

export async function unarchiveNotification(notificationId: string): Promise<ActionResult> {
  return setArchived(notificationId, false)
}

/**
 * Retry a failed/unconfigured email delivery. Rebuilds a simple email from the
 * notification's own title/body/href (the original rich template isn't
 * persisted) — an honest, functioning retry rather than a byte-perfect resend.
 */
export async function retryNotificationDelivery(deliveryId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const row = (
      await db
        .select({
          deliveryId: notificationDelivery.id,
          status: notificationDelivery.status,
          notificationId: notification.id,
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          href: notification.href,
        })
        .from(notificationDelivery)
        .innerJoin(notification, eq(notificationDelivery.notificationId, notification.id))
        .where(eq(notificationDelivery.id, deliveryId))
        .limit(1)
    )[0]
    if (!row) throw new AppError("NOT_FOUND")
    if (row.userId !== user.id) throw forbidden()
    if (!["FAILED", "NOT_CONFIGURED"].includes(row.status)) {
      return { ok: true } // nothing to retry
    }
    if (!isEmailConfigured()) {
      return { ok: false, error: "خدمة البريد غير مفعّلة حاليًا." }
    }

    const to = user.email
    const html = `<div dir="rtl" style="font-family:sans-serif"><h2>${row.title}</h2>${row.body ? `<p>${row.body}</p>` : ""}</div>`
    const res = await sendEmail({ to, subject: row.title, html })
    await db
      .update(notificationDelivery)
      .set({ status: res.delivered ? "SENT" : "FAILED", sentAt: res.delivered ? new Date() : null })
      .where(eq(notificationDelivery.id, deliveryId))

    revalidatePath("/dashboard/notifications")
    return res.delivered ? { ok: true } : { ok: false, error: "تعذّر إعادة إرسال البريد." }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function setEmailNotificationPreference(enabled: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await db
      .insert(notificationPreference)
      .values({ userId: user.id, emailEnabled: enabled })
      .onConflictDoUpdate({
        target: notificationPreference.userId,
        set: { emailEnabled: enabled, updatedAt: new Date() },
      })
    revalidatePath("/dashboard/notifications")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
