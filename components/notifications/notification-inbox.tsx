"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Mail, MailWarning, RotateCw, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  markNotificationRead,
  markAllNotificationsRead,
  retryNotificationDelivery,
  setEmailNotificationPreference,
} from "@/lib/actions/notification-inbox"
import type { NotificationView } from "@/lib/data/notifications"

const DELIVERY_LABEL: Record<string, string> = {
  SENT: "أُرسل بالبريد",
  FAILED: "فشل إرسال البريد",
  NOT_CONFIGURED: "البريد غير مفعّل",
  OPTED_OUT: "أوقفت إشعارات البريد",
  PENDING: "قيد الإرسال",
}

export function NotificationInbox({
  items,
  emailEnabled,
}: {
  items: NotificationView[]
  emailEnabled: boolean
}) {
  const router = useRouter()
  const [busyAll, setBusyAll] = useState(false)
  const [emailPref, setEmailPref] = useState(emailEnabled)
  const unreadCount = items.filter((n) => !n.readAt).length

  async function onMarkAllRead() {
    setBusyAll(true)
    await markAllNotificationsRead()
    setBusyAll(false)
    router.refresh()
  }

  async function onTogglePreference() {
    const next = !emailPref
    setEmailPref(next)
    await setEmailNotificationPreference(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Settings2 className="size-4 text-muted-foreground" />
          استلام إشعارات بالبريد الإلكتروني
        </div>
        <Button variant={emailPref ? "default" : "outline"} size="sm" onClick={onTogglePreference}>
          {emailPref ? "مفعّل" : "متوقف"}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"}
        </p>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" disabled={busyAll} onClick={onMarkAllRead}>
            <CheckCheck className="size-4" /> تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="لا توجد إشعارات بعد" description="ستظهر هنا إشعاراتك أولًا بأول." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((n) => (
            <NotificationRow key={n.id} item={n} />
          ))}
        </ul>
      )}
    </div>
  )
}

function NotificationRow({ item }: { item: NotificationView }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const emailDelivery = item.deliveries.find((d) => d.channel === "EMAIL")

  async function onOpen() {
    if (!item.readAt) {
      setBusy(true)
      await markNotificationRead(item.id)
      setBusy(false)
      router.refresh()
    }
  }

  async function onRetry(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    await retryNotificationDelivery(emailDelivery!.id)
    setBusy(false)
    router.refresh()
  }

  const content = (
    <div
      className={`flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/40 ${!item.readAt ? "bg-primary/5" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!item.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" />}
          <p className="font-medium text-foreground">{item.title}</p>
        </div>
        {item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(item.createdAt).toLocaleString("ar-SA")}
          </span>
          {emailDelivery && (
            <Badge variant={emailDelivery.status === "SENT" ? "outline" : "secondary"} className="gap-1">
              {emailDelivery.status === "SENT" ? <Mail className="size-3" /> : <MailWarning className="size-3" />}
              {DELIVERY_LABEL[emailDelivery.status] ?? emailDelivery.status}
            </Badge>
          )}
          {emailDelivery && ["FAILED", "NOT_CONFIGURED"].includes(emailDelivery.status) && (
            <button
              type="button"
              disabled={busy}
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RotateCw className="size-3" /> إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (item.href) {
    return (
      <li>
        <Link href={item.href} onClick={onOpen}>
          {content}
        </Link>
      </li>
    )
  }
  return (
    <li>
      <button type="button" className="w-full text-right" onClick={onOpen}>
        {content}
      </button>
    </li>
  )
}
