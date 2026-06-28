import Link from "next/link"
import { Video, Building2, Phone, CalendarClock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { appointmentStatusAr, paymentStatusAr } from "@/lib/status-labels"
import type { AppointmentRow } from "@/lib/data/appointments"

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  VIDEO_CONSULTATION: Video,
  IN_PERSON_CONSULTATION: Building2,
  PHONE_CONSULTATION: Phone,
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "CONFIRMED" || status === "COMPLETED") return "default"
  if (status.startsWith("CANCELLED") || status === "NO_SHOW") return "destructive"
  return "secondary"
}

export function AppointmentList({
  rows,
  perspective,
}: {
  rows: AppointmentRow[]
  perspective: "patient" | "doctor"
}) {
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <CalendarClock className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">لا توجد مواعيد حتى الآن.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((a) => {
        const Icon = typeIcon[a.type] ?? CalendarClock
        return (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-foreground">
                    {perspective === "patient" ? a.counterpartName : a.counterpartName}
                  </span>
                  <Badge variant={statusVariant(a.status)}>
                    {appointmentStatusAr(a.status)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("ar-SA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(a.startsAt))}
                </p>
                <p className="text-xs text-muted-foreground">{a.reference}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 text-sm">
              {a.priceAmount && (
                <span className="font-medium text-foreground">
                  {Number(a.priceAmount).toLocaleString("ar-SA")} {a.currency}
                </span>
              )}
              {a.paymentStatus && (
                <span className="text-xs text-muted-foreground">
                  الدفع: {paymentStatusAr(a.paymentStatus)}
                </span>
              )}
              {a.caseId && (
                <Link
                  href={`/dashboard/cases/${a.caseId}`}
                  className="text-xs text-primary hover:underline"
                >
                  عرض الحالة
                </Link>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
