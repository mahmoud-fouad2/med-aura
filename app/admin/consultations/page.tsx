import Link from "next/link"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS, hasPermission } from "@/lib/rbac"
import { listAppointmentsForAdmin } from "@/lib/data/appointments"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { CalendarClock } from "lucide-react"
import { ConsultationTable } from "@/components/admin/consultation-table"
import { firstParam } from "@/lib/utils"

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

export default async function AdminConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await requirePermissionPage(PERMISSIONS.APPOINTMENT_READ_ANY)
  const sp = await searchParams
  const status = firstParam(sp.status)

  const [rows, canRecordManualPayment] = await Promise.all([
    listAppointmentsForAdmin({ status }),
    hasPermission(viewer.id, PERMISSIONS.FINANCE_ACCESS),
  ])

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
          {rows.length.toLocaleString("ar-SA-u-nu-latn")} موعد استشارة/إجراء — اضغط أي صف لعرض التفاصيل
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
          <ConsultationTable rows={rows} canRecordManualPayment={canRecordManualPayment} />
        )}
      </Card>
    </div>
  )
}
