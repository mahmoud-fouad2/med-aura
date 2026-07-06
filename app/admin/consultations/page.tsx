import Link from "next/link"
import { CalendarClock } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listAppointmentsForAdmin } from "@/lib/data/appointments"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import {
  appointmentStatusAr,
  appointmentTypeAr,
  currencyAr,
  paymentStatusAr,
} from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "طلبات الاستشارة" }

const STATUS_TABS: { key?: string; label: string }[] = [
  { key: undefined, label: "الكل" },
  { key: "PENDING_PAYMENT", label: "بانتظار الدفع" },
  { key: "PENDING_PROVIDER_CONFIRMATION", label: "بانتظار الطبيب" },
  { key: "CONFIRMED", label: "مؤكدة" },
  { key: "COMPLETED", label: "منتهية" },
  { key: "CANCELLED_BY_PATIENT", label: "إلغاء المريض" },
  { key: "CANCELLED_BY_PROVIDER", label: "إلغاء الطبيب" },
  { key: "NO_SHOW", label: "لم يحضر" },
]

function statusTone(s: string): StatusTone {
  if (s === "CONFIRMED" || s === "COMPLETED" || s === "CHECKED_IN" || s === "IN_PROGRESS") return "success"
  if (s === "PENDING_PAYMENT" || s === "PENDING_PROVIDER_CONFIRMATION" || s === "RESCHEDULED") return "warning"
  if (
    s === "CANCELLED_BY_PATIENT" ||
    s === "CANCELLED_BY_PROVIDER" ||
    s === "NO_SHOW"
  )
    return "danger"
  return "neutral"
}

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

export default async function AdminConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.APPOINTMENT_READ_ANY)
  const sp = await searchParams
  const status = str(sp.status)

  const rows = await listAppointmentsForAdmin({ status })

  const buildHref = (s: string | undefined) => {
    const p = new URLSearchParams()
    if (s) p.set("status", s)
    const q = p.toString()
    return `/admin/consultations${q ? `?${q}` : ""}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">طلبات الاستشارة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length.toLocaleString("ar-SA-u-nu-latn")} موعد استشارة/إجراء
        </p>
      </div>

      <Card className="p-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.key ?? "all"}
              href={buildHref(t.key)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                (status === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70")
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="لا توجد مواعيد مطابقة"
            description="جرّب تعديل الفلاتر أو انتظر تسجيل مواعيد جديدة."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>المرجع</Th>
                  <Th>النوع</Th>
                  <Th>الحالة</Th>
                  <Th>المريض</Th>
                  <Th>الطبيب</Th>
                  <Th>الموعد</Th>
                  <Th>السعر</Th>
                  <Th>الدفع</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.caseId ? (
                        <Link href={`/admin/cases/${r.caseId}`} className="text-primary hover:underline">
                          {r.reference}
                        </Link>
                      ) : (
                        r.reference
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{appointmentTypeAr(r.type)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(r.status)} label={appointmentStatusAr(r.status)} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.patientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.counterpartName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {fmtDateTime(new Date(r.startsAt))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.priceAmount
                        ? `${r.priceAmount} ${currencyAr(r.currency)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.paymentStatus ? paymentStatusAr(r.paymentStatus) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
