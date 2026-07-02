import Link from "next/link"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listSafetyAlertsForAdmin, listSafetyAssignees, type SafetyAlertFilters } from "@/lib/data/admin-safety"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { SafetyAssignSelect } from "@/components/admin/safety-assign-select"
import { safetyAlertSeverityAr, safetyAlertStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "تنبيهات السلامة" }

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

function severityTone(sev: string): StatusTone {
  if (sev === "CRITICAL" || sev === "HIGH") return "danger"
  if (sev === "MEDIUM") return "warning"
  return "neutral"
}

function statusTone(status: string): StatusTone {
  if (status === "OPEN") return "danger"
  if (status === "REFERRED_TO_EMERGENCY") return "danger"
  if (["ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED"].includes(status)) return "warning"
  if (status === "RESOLVED") return "success"
  return "neutral"
}

export default async function AdminSafetyAlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.SAFETY_ALERT_MANAGE)
  const sp = await searchParams

  const filters: SafetyAlertFilters = {
    status: str(sp.status) ?? "open",
    severity: str(sp.severity),
  }

  const [alerts, assignees] = await Promise.all([
    listSafetyAlertsForAdmin(filters),
    listSafetyAssignees(),
  ])

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    const merged = { status: filters.status, severity: filters.severity, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) q.set(k, v)
    }
    return `/admin/safety-alerts?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">تنبيهات السلامة</h1>
        <p className="mt-1 text-sm text-muted-foreground">{alerts.length.toLocaleString("ar-SA")} تنبيه</p>
      </div>

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <FilterGroup label="الحالة">
          <TabLink active={filters.status === "open"} href={buildHref({ status: "open" })}>مفتوحة</TabLink>
          <TabLink active={filters.status === "closed"} href={buildHref({ status: "closed" })}>مغلقة</TabLink>
          <TabLink active={filters.status === undefined} href={buildHref({ status: undefined })}>الكل</TabLink>
        </FilterGroup>
        <FilterGroup label="الخطورة">
          <TabLink active={!filters.severity} href={buildHref({ severity: undefined })}>الكل</TabLink>
          {SEVERITIES.map((s) => (
            <TabLink key={s} active={filters.severity === s} href={buildHref({ severity: s })}>
              {safetyAlertSeverityAr(s)}
            </TabLink>
          ))}
        </FilterGroup>
      </Card>

      <Card className="overflow-hidden p-0">
        {alerts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="لا توجد تنبيهات مطابقة"
            description="لا توجد تنبيهات سلامة في هذا التصنيف حاليًا."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>الخطورة</Th>
                  <Th>الحالة</Th>
                  <Th>المريض</Th>
                  <Th>الحالة الطبية</Th>
                  <Th>الوصف</Th>
                  <Th>المصدر</Th>
                  <Th>المسؤول</Th>
                  <Th>التاريخ</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <StatusBadge tone={severityTone(a.severity)} label={safetyAlertSeverityAr(a.severity)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(a.status)} label={safetyAlertStatusAr(a.status)} />
                    </td>
                    <td className="px-4 py-3 text-foreground">{a.patientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link href={`/dashboard/cases/${a.caseId}`} className="text-primary hover:underline">
                        {a.caseReference}
                      </Link>
                      <span className="block text-xs">{a.procedureName}</span>
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground" title={a.summary ?? undefined}>
                      {a.summary ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.fromSymptomReport ? "بلاغ من المريض" : "أُنشئ إداريًا"}
                    </td>
                    <td className="px-4 py-3">
                      <SafetyAssignSelect alertId={a.id} currentAssigneeId={a.assignedTo} options={assignees} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("ar-SA")}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/cases/${a.caseId}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <ShieldAlert className="size-3.5" /> فتح الحالة
                      </Link>
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </Link>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
