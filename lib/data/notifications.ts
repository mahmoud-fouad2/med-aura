import { and, desc, eq, inArray, isNull, isNotNull } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { notification, notificationDelivery, notificationPreference } from "@/lib/db/schema"

export type NotificationDeliveryView = {
  id: string
  channel: string
  status: string
  sentAt: Date | null
}
export type NotificationView = {
  id: string
  type: string
  title: string
  body: string | null
  caseId: string | null
  href: string | null
  readAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  deliveries: NotificationDeliveryView[]
}

export async function listNotifications(
  userId: string,
  options: { limit?: number; archived?: boolean } = {},
): Promise<NotificationView[]> {
  const { limit = 50, archived = false } = options
  if (!isDbConfigured) return []
  const rows = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        archived ? isNotNull(notification.archivedAt) : isNull(notification.archivedAt),
      ),
    )
    .orderBy(desc(notification.createdAt))
    .limit(limit)
  if (rows.length === 0) return []

  const deliveries = await db
    .select()
    .from(notificationDelivery)
    .where(inArray(notificationDelivery.notificationId, rows.map((r) => r.id)))
  const byNotification = new Map<string, NotificationDeliveryView[]>()
  for (const d of deliveries) {
    const list = byNotification.get(d.notificationId) ?? []
    list.push({ id: d.id, channel: d.channel, status: d.status, sentAt: d.sentAt })
    byNotification.set(d.notificationId, list)
  }

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    caseId: r.caseId,
    href: r.href,
    readAt: r.readAt,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    deliveries: byNotification.get(r.id) ?? [],
  }))
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!isDbConfigured) return 0
  const rows = await db
    .select({ id: notification.id })
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        isNull(notification.readAt),
        isNull(notification.archivedAt),
      ),
    )
  return rows.length
}

export async function getEmailPreference(userId: string): Promise<boolean> {
  if (!isDbConfigured) return true
  const row = (
    await db
      .select({ emailEnabled: notificationPreference.emailEnabled })
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, userId))
      .limit(1)
  )[0]
  return row?.emailEnabled ?? true
}
