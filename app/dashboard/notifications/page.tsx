import { getCurrentUser } from "@/lib/session"
import { listNotifications, getEmailPreference } from "@/lib/data/notifications"
import { NotificationInbox } from "@/components/notifications/notification-inbox"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const user = (await getCurrentUser())!
  const [items, emailEnabled] = await Promise.all([
    listNotifications(user.id),
    getEmailPreference(user.id),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">الإشعارات</h1>
      <NotificationInbox items={items} emailEnabled={emailEnabled} />
    </div>
  )
}
