import Link from "next/link"
import {
  Plane,
  Hotel,
  Car,
  Languages,
  Users as UsersIcon,
  Clock,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listTravelQueue } from "@/lib/data/travel"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import {
  TravelAssignButton,
  TravelCancelButton,
} from "@/components/admin/travel-actions"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "طلبات السفر" }

const STATUS_TABS: { key?: string; label: string }[] = [
  { key: undefined, label: "الكل" },
  { key: "SUBMITTED", label: "بانتظار التعيين" },
  { key: "ASSIGNED", label: "قيد المعالجة" },
  { key: "OFFER_SENT", label: "عرض مُرسل" },
  { key: "ACCEPTED", label: "مقبول" },
  { key: "CANCELLED", label: "ملغاة" },
  { key: "FULFILLED", label: "منتهية" },
]

function statusLabel(s: string): string {
  const M: Record<string, string> = {
    DRAFT: "مسودّة",
    SUBMITTED: "بانتظار التعيين",
    INFO_REQUESTED: "بانتظار معلومات",
    ASSIGNED: "قيد المعالجة",
    OFFER_SENT: "عرض مُرسل",
    ACCEPTED: "مقبول",
    DECLINED: "مرفوض",
    CANCELLED: "ملغى",
    FULFILLED: "منتهي",
  }
  return M[s] ?? s
}

function statusTone(s: string): StatusTone {
  if (s === "ACCEPTED" || s === "FULFILLED") return "success"
  if (s === "SUBMITTED" || s === "INFO_REQUESTED") return "warning"
  if (s === "DECLINED" || s === "CANCELLED") return "danger"
  return "neutral"
}

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

export default async function AdminTravelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.TRAVEL_OFFER_MANAGE)
  const sp = await searchParams
  const status = str(sp.status)
  const items = await listTravelQueue(status)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          طلبات السفر
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length.toLocaleString("ar-SA-u-nu-latn")} طلب. Med Aura لا تنفّذ حجزًا
          فعليًا للطيران أو الفندق — الطلبات هنا للتنسيق فقط، والعروض التي يصدرها
          فريق المتابعة تبقى مقترحات مسجّلة.
        </p>
      </div>

      <Card className="p-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.key ?? "all"}
              href={
                t.key
                  ? `/admin/travel?status=${t.key}`
                  : "/admin/travel"
              }
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

      {items.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="لا توجد طلبات مطابقة"
          description="ستظهر طلبات السفر هنا فور إنشائها من قِبل المرضى."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((r) => {
            const overdue =
              r.slaDueAt &&
              (r.status === "SUBMITTED" || r.status === "INFO_REQUESTED") &&
              new Date(r.slaDueAt).getTime() < Date.now()
            return (
              <Card key={r.id} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-bold text-foreground">
                        {r.patientName}
                      </p>
                      <StatusBadge
                        tone={statusTone(r.status)}
                        label={statusLabel(r.status)}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {countryNameAr(r.patientCountry ?? "")} →{" "}
                      {countryNameAr(r.destinationCountry)}
                      {r.destinationCity ? `، ${r.destinationCity}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/cases/${r.caseId}`}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    الحالة
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                  <Field
                    icon={UsersIcon}
                    label="المسافرون"
                    value={r.travelers.toLocaleString("ar-SA-u-nu-latn")}
                  />
                  <Field
                    icon={Clock}
                    label="الوصول → المغادرة"
                    value={`${r.arrivalDate ?? "؟"} → ${r.departureDate ?? "؟"}`}
                  />
                  <Field
                    icon={Hotel}
                    label="الإقامة"
                    value={r.needsAccommodation ? "مطلوبة" : "غير مطلوبة"}
                  />
                  <Field
                    icon={Car}
                    label="نقل المطار"
                    value={r.needsAirportTransfer ? "مطلوب" : "غير مطلوب"}
                  />
                  <Field
                    icon={Languages}
                    label="مترجم"
                    value={
                      r.needsInterpreter
                        ? r.interpreterLanguage || "مطلوب"
                        : "غير مطلوب"
                    }
                  />
                  <Field
                    icon={Plane}
                    label="العروض"
                    value={`${r.offerCount.toLocaleString("ar-SA-u-nu-latn")}${r.lastOfferStatus ? ` — ${r.lastOfferStatus}` : ""}`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {r.assignedConciergeName
                      ? `يتابعه: ${r.assignedConciergeName}`
                      : "غير معيَّن"}
                  </span>
                  {overdue && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      متأخر عن مهلة الرد
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                  <TravelAssignButton
                    requestId={r.id}
                    assigned={Boolean(r.assignedConciergeId)}
                  />
                  {r.status !== "CANCELLED" && r.status !== "FULFILLED" && (
                    <TravelCancelButton requestId={r.id} />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 size-3.5 text-primary" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  )
}
