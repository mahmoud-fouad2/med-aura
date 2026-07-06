import Link from "next/link"
import {
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  Siren,
  UserPlus,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import {
  listSafetyAlertsForAdmin,
  listSafetyAssignees,
  type SafetyAlertFilters,
} from "@/lib/data/admin-safety"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { SafetyAssignSelect } from "@/components/admin/safety-assign-select"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  safetyAlertSeverityAr,
  safetyAlertStatusAr,
} from "@/lib/status-labels"

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
  if (["ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED"].includes(status))
    return "warning"
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

  const critical = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH",
  ).length
  const unassigned = alerts.filter((a) => !a.assignedTo).length

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    const merged = {
      status: filters.status,
      severity: filters.severity,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) q.set(k, v)
    }
    return `/admin/safety-alerts?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="السلامة"
        title="تنبيهات السلامة"
        description="تنبيهات مسجّلة على حالات المرضى — تعطى الأولوية للتنبيهات الحرجة وغير المسندة."
        stats={
          alerts.length > 0
            ? [
                { label: "الإجمالي", value: alerts.length.toLocaleString("ar-SA-u-nu-latn") },
                {
                  label: "حرجة / عالية",
                  value: critical.toLocaleString("ar-SA-u-nu-latn"),
                },
                { label: "بدون تعيين", value: unassigned.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <FilterGroup label="الحالة">
          <TabLink
            active={filters.status === "open"}
            href={buildHref({ status: "open" })}
          >
            مفتوحة
          </TabLink>
          <TabLink
            active={filters.status === "closed"}
            href={buildHref({ status: "closed" })}
          >
            مغلقة
          </TabLink>
          <TabLink
            active={filters.status === undefined}
            href={buildHref({ status: undefined })}
          >
            الكل
          </TabLink>
        </FilterGroup>
        <FilterGroup label="الخطورة">
          <TabLink
            active={!filters.severity}
            href={buildHref({ severity: undefined })}
          >
            الكل
          </TabLink>
          {SEVERITIES.map((s) => (
            <TabLink
              key={s}
              active={filters.severity === s}
              href={buildHref({ severity: s })}
            >
              {safetyAlertSeverityAr(s)}
            </TabLink>
          ))}
        </FilterGroup>
      </Card>

      <Card className="overflow-hidden p-0">
        {alerts.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={ShieldCheck}
              title="لا توجد تنبيهات مطابقة"
              description="لا توجد تنبيهات سلامة في هذا التصنيف حاليًا — كل شيء على ما يرام."
              tone="muted"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
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
              <tbody className="divide-y divide-border/60">
                {alerts.map((a) => {
                  const patientInitial = a.patientName.trim().charAt(0) || "؟"
                  const isCritical =
                    a.severity === "CRITICAL" || a.severity === "HIGH"
                  return (
                    <tr
                      key={a.id}
                      className={
                        "transition-colors hover:bg-muted/25 " +
                        (isCritical && a.status === "OPEN"
                          ? "bg-destructive/[.02]"
                          : "")
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isCritical && (
                            <Siren
                              className="size-4 shrink-0 animate-pulse text-destructive"
                              aria-label="حرجة"
                            />
                          )}
                          <StatusBadge
                            tone={severityTone(a.severity)}
                            label={safetyAlertSeverityAr(a.severity)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={statusTone(a.status)}
                          label={safetyAlertStatusAr(a.status)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/15">
                            {patientInitial}
                          </span>
                          <span className="font-medium text-foreground">
                            {a.patientName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <Link
                            href={`/dashboard/cases/${a.caseId}`}
                            dir="ltr"
                            className="block font-mono text-[10px] font-medium text-primary hover:underline"
                          >
                            {a.caseReference}
                          </Link>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {a.procedureName}
                          </span>
                        </div>
                      </td>
                      <td
                        className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground"
                        title={a.summary ?? undefined}
                      >
                        <span className="line-clamp-2">
                          {a.summary ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                            (a.fromSymptomReport
                              ? "bg-warning/15 text-warning-foreground"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {a.fromSymptomReport
                            ? "بلاغ من المريض"
                            : "أُنشئ إداريًا"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.assignedTo ? (
                          <SafetyAssignSelect
                            alertId={a.id}
                            currentAssigneeId={a.assignedTo}
                            options={assignees}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <UserPlus className="size-3 text-warning-foreground" />
                            <SafetyAssignSelect
                              alertId={a.id}
                              currentAssigneeId={a.assignedTo}
                              options={assignees}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/cases/${a.caseId}`}
                          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <ShieldAlert className="size-3.5" />
                          فتح
                          <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_rgba(74,29,150,0.35)]"
          : "bg-muted text-muted-foreground hover:bg-muted/70")
      }
    >
      {children}
    </Link>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-start font-medium tracking-wide">
      {children}
    </th>
  )
}
