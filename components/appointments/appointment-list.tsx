import Link from "next/link"
import {
  Video,
  Building2,
  Phone,
  CalendarClock,
  Sparkles,
  Stethoscope,
  ChevronLeft,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  appointmentStatusAr,
  appointmentTypeAr,
  paymentStatusAr,
  currencyAr,
} from "@/lib/status-labels"
import type { AppointmentRow } from "@/lib/data/appointments"
import { isVideoConfigured } from "@/lib/env"
import { videoJoinWindow } from "@/lib/video"

import { AddToCalendarDropdown } from "@/components/calendar/add-to-calendar-dropdown"
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button"

const typeIcon: Record<string, LucideIcon> = {
  VIDEO_CONSULTATION: Video,
  IN_PERSON_CONSULTATION: Building2,
  PHONE_CONSULTATION: Phone,
  PROCEDURE: Sparkles,
  FOLLOW_UP: Stethoscope,
}

const JOINABLE = new Set(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "RESCHEDULED"])

/**
 * The consultation entry shows only when it can actually lead somewhere:
 * a video appointment, a configured provider, a joinable status, and the
 * entry window not yet closed. The video page re-checks all of it
 * server-side — this is presentation, not the security boundary.
 */
function videoEntry(a: AppointmentRow): "open" | "upcoming" | null {
  if (a.type !== "VIDEO_CONSULTATION" || !isVideoConfigured()) return null
  if (!JOINABLE.has(a.status)) return null
  const { beforeMinutes, afterMinutes } = videoJoinWindow()
  const now = Date.now()
  const joinFrom = new Date(a.startsAt).getTime() - beforeMinutes * 60_000
  const joinUntil = new Date(a.endsAt).getTime() + afterMinutes * 60_000
  if (now > joinUntil) return null
  return now >= joinFrom ? "open" : "upcoming"
}

function statusTone(status: string): {
  bg: string
  text: string
} {
  if (status === "COMPLETED")
    return { bg: "bg-success/10", text: "text-success" }
  if (
    status === "CONFIRMED" ||
    status === "CHECKED_IN" ||
    status === "IN_PROGRESS" ||
    status === "RESCHEDULED"
  )
    return { bg: "bg-primary/10", text: "text-primary" }
  if (status.startsWith("CANCELLED") || status === "NO_SHOW")
    return { bg: "bg-destructive/10", text: "text-destructive" }
  return { bg: "bg-warning/15", text: "text-warning-foreground" }
}

function fmtDayLabel(d: Date): { day: string; month: string; weekday: string } {
  return {
    day: new Intl.DateTimeFormat("ar-SA-u-nu-latn", { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("ar-SA-u-nu-latn", { month: "short" }).format(d),
    weekday: new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "short" }).format(d),
  }
}

export function AppointmentList({
  rows,
  perspective,
}: {
  rows: AppointmentRow[]
  perspective: "patient" | "doctor"
}) {
  void perspective // reserved for future perspective-specific tweaks

  if (rows.length === 0) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={CalendarClock}
          title="لا توجد مواعيد حتى الآن"
          description="ستظهر هنا استشاراتك، إجراءاتك، ومتابعاتك بمجرد جدولتها."
        />
      </Card>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map((a) => {
        const Icon = typeIcon[a.type] ?? CalendarClock
        const d = new Date(a.startsAt)
        const { day, month, weekday } = fmtDayLabel(d)
        const tone = statusTone(a.status)
        const isPast = d.getTime() < Date.now() && a.status !== "CONFIRMED"
        const entry = videoEntry(a)

        return (
          <li key={a.id}>
            <Card
              className={
                "flex items-stretch gap-0 overflow-hidden p-0 rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 " +
                (isPast ? "opacity-80" : "hover:border-primary/40 hover:shadow-elegant")
              }
            >
              {/* Date tile column */}
              <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 border-e border-border/60 bg-muted/25 py-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {weekday}
                </span>
                <span className="font-heading text-2xl font-bold leading-none text-foreground">
                  {day}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {month}
                </span>
              </div>

              {/* Main body */}
              <div className="flex min-w-0 flex-1 items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-heading font-bold text-foreground">
                        {appointmentTypeAr(a.type)}
                      </p>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          tone.bg +
                          " " +
                          tone.text
                        }
                      >
                        {appointmentStatusAr(a.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      مع{" "}
                      <span className="font-medium text-foreground">
                        {a.counterpartName}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span dir="ltr" className="tabular-nums">
                        {new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(d)}
                      </span>
                      <span dir="ltr" className="font-mono">
                        {a.reference}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 text-end text-sm">
                  {a.priceAmount && (
                    <span className="font-heading text-base font-bold tabular-nums text-foreground">
                      {Number(a.priceAmount).toLocaleString("ar-SA-u-nu-latn")}{" "}
                      <span className="text-xs text-muted-foreground">
                        {currencyAr(a.currency)}
                      </span>
                    </span>
                  )}
                  {a.paymentStatus && (
                    <span className="text-[10px] text-muted-foreground">
                      الدفع: {paymentStatusAr(a.paymentStatus)}
                    </span>
                  )}
                  {a.caseId && (
                    <Link
                      href={`/dashboard/cases/${a.caseId}`}
                      className="group inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                    >
                      عرض الحالة
                      <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                    </Link>
                  )}
                  {entry && (
                    <Link
                      href={`/consultation/${a.id}/video`}
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors " +
                        (entry === "open"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          : "bg-primary/10 text-primary hover:bg-primary/15")
                      }
                    >
                      <Video className="size-3.5" />
                      {entry === "open" ? "دخول الاستشارة" : "استشارة عن بُعد"}
                    </Link>
                  )}
                  {!isPast &&
                    (a.status === "CONFIRMED" ||
                      a.status === "CHECKED_IN" ||
                      a.status === "PENDING_PAYMENT" ||
                      a.status === "RESCHEDULED") && (
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
                        <AddToCalendarDropdown
                          event={{
                            title: `${appointmentTypeAr(a.type)} مع ${a.counterpartName}`,
                            description: `موعد ${appointmentTypeAr(a.type)} عبر منصة Med Aura.\nالمرجع: ${a.reference}`,
                            location:
                              a.type === "VIDEO_CONSULTATION"
                                ? "عيادة Med Aura الافتراضية"
                                : "المركز الطبي المعتمد",
                            startTime: new Date(a.startsAt),
                            endTime: new Date(a.endsAt),
                            url:
                              a.type === "VIDEO_CONSULTATION"
                                ? `https://medauraworld.com/consultation/${a.id}/video`
                                : undefined,
                          }}
                        />
                        <CancelAppointmentButton
                          appointmentId={a.id}
                          reference={a.reference}
                        />
                      </div>
                    )}
                </div>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
