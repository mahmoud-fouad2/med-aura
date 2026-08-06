import Link from "next/link"
import {
  FileHeart, AlertTriangle, ClipboardCheck,
  ClipboardList, ShieldAlert, Wallet, Plug,
  CheckCircle2, XCircle, Database, Mail, HardDrive, CreditCard,
} from "lucide-react"
import { requireAuthPage } from "@/lib/session"
import { getUserPermissions, PERMISSIONS } from "@/lib/rbac"
import {
  getAdminOverviewKpis,
  listCasesNeedingIntervention,
  listRecentApplications,
  listHighPrioritySafetyAlerts,
  getRecent30dActivity,
} from "@/lib/data/admin-overview"
import { ActivityChart } from "@/components/admin/activity-chart"
import { listRecentActivity } from "@/lib/data/admin-activity"
import { listRefundRequestsFinance, listPayments } from "@/lib/data/finance"
import { getMigrationStatus } from "@/lib/db/migration-status"
import { isStripeConfigured, isR2Configured, isEmailConfigured } from "@/lib/env"
import { actionLabelAr } from "@/lib/audit-labels"
import { StatStrip, type Stat } from "@/components/admin/stat-strip"
import { CommandCenter, type AttentionItem } from "@/components/admin/command-center"
import { WorkspacePanel, WorkspaceSection, WorkspaceEmpty } from "@/components/admin/workspace-panel"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type ActivityRow = { id: string; actorName: string | null; action: string; createdAt: Date }

/** Collapses repeated same-actor/same-action/same-day rows into one row with a count. */
function summarizeActivity(rows: ActivityRow[]) {
  const groups: { key: string; actorName: string; actionLabel: string; count: number; latest: Date; id: string }[] = []
  for (const r of rows) {
    const actor = r.actorName ?? "النظام"
    const actionLabel = actionLabelAr(r.action)
    const key = `${actor}|${actionLabel}|${r.createdAt.toDateString()}`
    const existing = groups.find((g) => g.key === key)
    if (existing) {
      existing.count += 1
      if (r.createdAt > existing.latest) existing.latest = r.createdAt
    } else {
      groups.push({ key, actorName: actor, actionLabel, count: 1, latest: r.createdAt, id: r.id })
    }
  }
  return groups.sort((a, b) => b.latest.getTime() - a.latest.getTime()).slice(0, 4)
}

export default async function AdminOverviewPage() {
  const user = await requireAuthPage("/admin")
  const perms = await getUserPermissions(user.id)
  const canFinance = perms.has(PERMISSIONS.FINANCE_ACCESS)
  const canCases = perms.has(PERMISSIONS.CASE_READ_ANY)
  const canReview = perms.has(PERMISSIONS.PROVIDER_REVIEW)
  const canSafety = perms.has(PERMISSIONS.SAFETY_ALERT_MANAGE)
  const canAudit = perms.has(PERMISSIONS.AUDIT_READ)
  const canAdmin = perms.has(PERMISSIONS.ADMIN_ACCESS)

  const [kpis, activity30d, interventionCases, recentApplications, highPrioritySafety, recentActivity, refunds, pendingPaymentsList, dbStatus] =
    await Promise.all([
      getAdminOverviewKpis(canFinance),
      canCases ? getRecent30dActivity(canFinance) : Promise.resolve([]),
      canCases ? listCasesNeedingIntervention() : Promise.resolve([]),
      canReview ? listRecentApplications() : Promise.resolve([]),
      canSafety ? listHighPrioritySafetyAlerts() : Promise.resolve([]),
      canAudit ? listRecentActivity(8) : Promise.resolve([]),
      canFinance ? listRefundRequestsFinance(6) : Promise.resolve([]),
      canFinance ? listPayments(200) : Promise.resolve([]),
      canAdmin ? getMigrationStatus() : Promise.resolve(null),
    ])
  const pendingPayments = pendingPaymentsList.filter((p) => ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(p.status))
  const openRefunds = refunds.filter((r) => ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROVIDER_CONFIRMED"].includes(r.status))
  const activitySummary = summarizeActivity(recentActivity)

  const systemChecks = dbStatus
    ? [
        { key: "db", label: "قاعدة البيانات", icon: Database, ok: dbStatus.connected && dbStatus.ready },
        { key: "pay", label: "بوابة الدفع", icon: CreditCard, ok: isStripeConfigured() },
        { key: "storage", label: "تخزين الملفات", icon: HardDrive, ok: isR2Configured() },
        { key: "mail", label: "البريد", icon: Mail, ok: isEmailConfigured() },
      ]
    : []
  const systemFailures = systemChecks.filter((c) => !c.ok)

  const attentionItems: AttentionItem[] = [
    ...(canSafety && highPrioritySafety.length > 0
      ? [{ key: "safety", icon: ShieldAlert, label: "تنبيهات سلامة عالية الأولوية", count: highPrioritySafety.length, href: "/admin/safety-alerts" }]
      : []),
    ...(canCases && interventionCases.length > 0
      ? [{ key: "intervention", icon: AlertTriangle, label: "حالات تحتاج تدخلًا", count: interventionCases.length, href: "/admin/cases" }]
      : []),
    ...(canAdmin && systemFailures.length > 0
      ? [{ key: "system", icon: Database, label: "خدمات نظام غير سليمة", count: systemFailures.length, href: "/admin/system-health" }]
      : []),
    ...(canCases && kpis.overdueFollowUps > 0
      ? [{ key: "followups", icon: ClipboardList, label: "متابعات متأخرة", count: kpis.overdueFollowUps, href: "/admin/follow-ups?status=overdue" }]
      : []),
    ...(canReview && recentApplications.length > 0
      ? [{ key: "applications", icon: ClipboardCheck, label: "طلبات انضمام بانتظار المراجعة", count: recentApplications.length, href: "/admin/applications" }]
      : []),
    ...(canFinance && pendingPayments.length + openRefunds.length > 0
      ? [{ key: "payments", icon: Wallet, label: "مدفوعات واسترجاعات معلّقة", count: pendingPayments.length + openRefunds.length, href: "/admin/finance" }]
      : []),
  ]

  // Order fixed by priority: intervention needed, then pending review, then
  // the two informational (non-alert) totals — not conditioned on values.
  const stats: Stat[] = [
    {
      key: "intervention",
      label: "حالات تحتاج تدخلًا",
      value: kpis.casesNeedingIntervention.toLocaleString("ar-SA-u-nu-latn"),
      description: kpis.casesNeedingIntervention > 0 ? "تحتاج مراجعة فورية" : "لا توجد حالات حرجة",
      href: "/admin/cases",
      tone: kpis.casesNeedingIntervention > 0 ? "danger" : "success",
    },
    ...(canReview
      ? [{
          key: "applications",
          label: "طلبات معلّقة",
          value: kpis.pendingApplications.toLocaleString("ar-SA-u-nu-latn"),
          description: kpis.pendingApplications > 0 ? "بانتظار المراجعة" : "لا طلبات معلّقة",
          href: "/admin/applications",
          tone: (kpis.pendingApplications > 0 ? "warning" : "neutral") as Stat["tone"],
        }]
      : []),
    {
      key: "patients",
      label: "إجمالي المرضى",
      value: kpis.totalPatients.toLocaleString("ar-SA-u-nu-latn"),
      description: "مسجّلون على المنصة",
    },
    ...(canFinance
      ? [{
          key: "collected",
          label: "إجمالي المحصّل",
          value: `${(kpis.totalPaidAmount ?? 0).toLocaleString("ar-SA-u-nu-latn")} ر.س`,
          description: "مدفوعات ناجحة",
          href: "/admin/finance",
          tone: "success" as Stat["tone"],
        }]
      : []),
  ]

  const nowLabel = new Date().toLocaleString("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="space-y-4">
      {/* Page header — one compact row, no card wrapper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">مرحبًا، {user.name}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">حركة المنصة والمهام التي تحتاج متابعة · آخر تحديث {nowLabel}</p>
        </div>
        {canCases && (
          <Link href="/admin/cases" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <FileHeart className="size-4" /> إدارة الحالات
          </Link>
        )}
      </div>

      {stats.length > 0 && <StatStrip stats={stats} />}

      {(canSafety || canCases || canReview || canFinance || canAdmin) && <CommandCenter items={attentionItems} />}

      <WorkspacePanel
        main={
          canCases ? (
            <WorkspaceSection title="النشاط خلال آخر 30 يومًا" description="حالات جديدة ودفعات ناجحة">
              <div className="p-3">
                {activity30d.length > 0 ? (
                  <ActivityChart data={activity30d} showFinance={canFinance} />
                ) : (
                  <WorkspaceEmpty text="لا يوجد نشاط كافٍ لعرض اتجاه خلال آخر 30 يومًا بعد." />
                )}
              </div>
            </WorkspaceSection>
          ) : null
        }
        side={
          <>
            <QuickActionsGrid perms={perms} />

            {canAdmin && systemChecks.length > 0 && (
              <WorkspaceSection title="حالة النظام" viewAllHref="/admin/system-health">
                <div className="divide-y divide-border/60">
                  {systemChecks.map((c) => (
                    <div key={c.key} className="flex items-center gap-2 px-4 py-2 text-xs">
                      <c.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-foreground">{c.label}</span>
                      {c.ok ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0 text-destructive" />
                      )}
                    </div>
                  ))}
                </div>
              </WorkspaceSection>
            )}

            {canAudit && (
              <WorkspaceSection title="آخر النشاطات" viewAllHref="/admin/activity">
                {activitySummary.length === 0 ? (
                  <WorkspaceEmpty text="لا يوجد نشاط مسجّل بعد." />
                ) : (
                  <div className="divide-y divide-border/60">
                    {activitySummary.map((a) => (
                      <Link key={a.id} href="/admin/activity" className="flex items-center justify-between gap-2 px-4 py-2 text-xs transition-colors hover:bg-muted/40">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{a.actorName}</p>
                          <p className="truncate text-muted-foreground">
                            {a.count > 1 ? `${a.actionLabel} — ${a.count.toLocaleString("ar-SA-u-nu-latn")} مرات اليوم` : a.actionLabel}
                          </p>
                        </div>
                        <span className="shrink-0 text-muted-foreground">
                          {a.latest.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </WorkspaceSection>
            )}
          </>
        }
      />
    </div>
  )
}

function QuickActionsGrid({ perms }: { perms: Set<string> }) {
  const actions: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; show: boolean }[] = [
    { href: "/admin/applications", label: "طلبات الانضمام", icon: ClipboardCheck, show: perms.has(PERMISSIONS.PROVIDER_REVIEW) },
    { href: "/admin/cases", label: "إدارة الحالات", icon: FileHeart, show: perms.has(PERMISSIONS.CASE_READ_ANY) },
    { href: "/admin/safety-alerts", label: "تنبيهات السلامة", icon: ShieldAlert, show: perms.has(PERMISSIONS.SAFETY_ALERT_MANAGE) },
    { href: "/admin/finance", label: "لوحة المالية", icon: Wallet, show: perms.has(PERMISSIONS.FINANCE_ACCESS) },
    { href: "/admin/concierge", label: "فريق المتابعة", icon: Plug, show: perms.has(PERMISSIONS.CONCIERGE_ACCESS) },
  ].filter((a) => a.show)

  if (actions.length === 0) return null
  return (
    <WorkspaceSection title="إجراءات سريعة">
      <div className="grid grid-cols-2 gap-2 p-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border/60 px-2 py-3 text-center text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <a.icon className="size-[18px] text-primary" />
            <span className="truncate">{a.label}</span>
          </Link>
        ))}
      </div>
    </WorkspaceSection>
  )
}
