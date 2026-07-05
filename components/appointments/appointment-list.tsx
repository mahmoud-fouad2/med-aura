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

const typeIcon: Record<string, LucideIcon> = {
  VIDEO_CONSULTATION: Video,
  IN_PERSON_CONSULTATION: Building2,
  PHONE_CONSULTATION: Phone,
  PROCEDURE: Sparkles,
  FOLLOW_UP: Stethoscope,
}

function statusTone(status: string): {
  bg: string
  text: string
} {
  if (status === "COMPLETED")
    return { bg: "bg-success/10", text: "text-success" }
  if (status === "CONFIRMED" || status === "CHECKED_IN" || status === "IN_PROGRESS")
    return { bg: "bg-primary/10", text: "text-primary" }
  if (status.startsWith("CANCELLED") || status === "NO_SHOW")
    return { bg: "bg-destructive/10", text: "text-destructive" }
  return { bg: "bg-warning/15", text: "text-warning-foreground" }
}

function fmtDayLabel(d: Date): { day: string; month: string; weekday: string } {
  return {
    day: new Intl.DateTimeFormat("ar-SA", { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(d),
    weekday: new Intl.DateTimeFormat("ar-SA", { weekday: "short" }).format(d),
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

        return (
          <li key={a.id}>
            <Card
              className={
                "flex items-stretch gap-0 overflow-hidden p-0 transition-shadow " +
                (isPast ? "opacity-80" : "hover:shadow-[0_2px_4px_rgba(20,20,60,0.05),0_12px_28px_-12px_rgba(20,20,60,0.16)]")
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
                        {new Intl.DateTimeFormat("ar-SA", {
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
                      {Number(a.priceAmount).toLocaleString("ar-SA")}{" "}
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
                </div>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
