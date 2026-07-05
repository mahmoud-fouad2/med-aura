"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Mail,
  MailWarning,
  RotateCw,
  Settings2,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
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

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" })
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
      <Card className="flex flex-wrap items-center justify-between gap-3 border-border/70 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Settings2 className="size-[18px]" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              استلام إشعارات بالبريد الإلكتروني
            </p>
            <p className="text-[11px] text-muted-foreground">
              تفضيلات القنوات الأخرى في صفحة{" "}
              <Link
                href="/dashboard/notifications/preferences"
                className="text-primary hover:underline"
              >
                التفضيلات
              </Link>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onTogglePreference}
          aria-pressed={emailPref}
          aria-label={emailPref ? "إيقاف بريد الإشعارات" : "تفعيل بريد الإشعارات"}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
          style={{
            backgroundColor: emailPref
              ? "var(--color-primary)"
              : "var(--color-muted)",
          }}
        >
          <span
            className={
              "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform " +
              (emailPref
                ? "translate-x-5 rtl:-translate-x-5"
                : "translate-x-0.5 rtl:-translate-x-0.5")
            }
          />
        </button>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {unreadCount > 0 ? (
            <>
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
              <p className="text-muted-foreground">
                {unreadCount === 1 ? "إشعار غير مقروء" : "إشعارات غير مقروءة"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">لا توجد إشعارات غير مقروءة</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            loading={busyAll}
            onClick={onMarkAllRead}
          >
            <CheckCheck className="size-4" />
            تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Bell}
            title="لا توجد إشعارات بعد"
            description="ستظهر هنا إشعاراتك أولًا بأول: تحديثات الحالة، تذكيرات المواعيد، وإشعارات الدفع."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border/60">
            {items.map((n) => (
              <NotificationRow key={n.id} item={n} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function NotificationRow({ item }: { item: NotificationView }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const emailDelivery = item.deliveries.find((d) => d.channel === "EMAIL")
  const unread = !item.readAt

  async function onOpen() {
    if (unread) {
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
      className={
        "group flex items-start gap-3 p-4 transition-colors " +
        (unread ? "bg-primary/[.03]" : "") +
        " hover:bg-muted/25"
      }
    >
      {/* Unread indicator column */}
      <div className="mt-1 flex w-1.5 shrink-0 justify-center">
        {unread && (
          <span className="size-2 rounded-full bg-primary ring-4 ring-primary/15" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={
              "font-medium leading-snug " +
              (unread ? "text-foreground" : "text-muted-foreground")
            }
          >
            {item.title}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeTime(new Date(item.createdAt))}
          </span>
        </div>
        {item.body && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {item.body}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {emailDelivery && (
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                (emailDelivery.status === "SENT"
                  ? "bg-success/10 text-success"
                  : emailDelivery.status === "FAILED"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground")
              }
            >
              {emailDelivery.status === "SENT" ? (
                <Mail className="size-3" />
              ) : (
                <MailWarning className="size-3" />
              )}
              {DELIVERY_LABEL[emailDelivery.status] ?? emailDelivery.status}
            </span>
          )}
          {emailDelivery &&
            ["FAILED", "NOT_CONFIGURED"].includes(emailDelivery.status) && (
              <button
                type="button"
                disabled={busy}
                onClick={onRetry}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
              >
                <RotateCw
                  className={"size-3 " + (busy ? "animate-spin" : "")}
                />
                إعادة المحاولة
              </button>
            )}
        </div>
      </div>

      {item.href && (
        <ChevronLeft className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
      )}
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
