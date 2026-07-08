import Link from "next/link"
import { Settings2 } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { listNotifications, getEmailPreference } from "@/lib/data/notifications"
import { NotificationInbox } from "@/components/notifications/notification-inbox"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const archived = view === "archived"
  const user = (await getCurrentUser())!
  const [items, emailEnabled] = await Promise.all([
    listNotifications(user.id, { archived }),
    getEmailPreference(user.id),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          الإشعارات
        </h1>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link href="/dashboard/notifications/preferences">
              <Settings2 className="size-4" />
              التفضيلات
            </Link>
          }
        />
      </div>
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1 text-sm">
        <Link
          href="/dashboard/notifications"
          className={
            "flex-1 rounded-md px-3 py-1.5 text-center font-medium transition-colors " +
            (!archived ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
          }
        >
          الوارد
        </Link>
        <Link
          href="/dashboard/notifications?view=archived"
          className={
            "flex-1 rounded-md px-3 py-1.5 text-center font-medium transition-colors " +
            (archived ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
          }
        >
          الأرشيف
        </Link>
      </div>
      <NotificationInbox items={items} emailEnabled={emailEnabled} archived={archived} />
    </div>
  )
}
