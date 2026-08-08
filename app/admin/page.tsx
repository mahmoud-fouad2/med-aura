import Link from "next/link"
import {
  FileHeart, AlertTriangle, ClipboardCheck,
  ClipboardList, ShieldAlert, Wallet, Plug,
  CheckCircle2, XCircle, Database, Mail, HardDrive, CreditCard, ChevronLeft,
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
import { safeName } from "@/lib/format"
import { caseStatusAr, safetyAlertSeverityAr, paymentPurposeAr } from "@/lib/status-labels"
import { formatMoney, headlineTotal, type MoneyTotal } from "@/lib/money"
import { Badge } from "@/components/ui/badge"
import { StatStrip, type Stat } from "@/components/admin/stat-strip"
import { CommandCenter, type AttentionItem } from "@/components/admin/command-center"
import { WorkspacePanel, WorkspaceSection, WorkspaceEmpty } from "@/components/admin/workspace-panel"

/** Below this many combined events across 30 days, a chart would just be a
 *  near-empty box — show a compact message instead. */
const MIN_CHART_ACTIVITY = 5

type WorkItem = {
  key: string
  kind: string
  href: string
  title: string
  subtitle: string
  badge: string
  badgeVariant: "outline" | "secondary" | "destructive" | "default"
}

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

/**
 * Collected revenue is per-currency. The headline number shows one currency
 * (base first) and the description names the rest — summing SAR and USD into
 * a single "ر.س" figure would report money that was never collected.
 */
function collectedStat(paidTotals: MoneyTotal[]): Stat {
  const { value, others } = headlineTotal(paidTotals)
  return {
    key: "collected",
    label: "إجمالي المحصّل",
    value,
    description: others ? `مدفوعات ناجحة — و${others}` : "مدفوعات ناجحة",
    href: "/admin/finance",
    tone: "success",
  }
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

  // Red is earned, not default: only safety alerts, system failures, and
  // cases actively needing intervention are "critical". Ordinary backlog
  // (applications, payments, follow-ups) is routine work, not an alarm.
  const attentionItems: AttentionItem[] = [
    ...(canSafety && highPrioritySafety.length > 0
      ? [{ key: "safety", icon: ShieldAlert, label: "تنبيهات سلامة عالية الأولوية", count: highPrioritySafety.length, href: "/admin/safety-alerts", tone: "critical" as const }]
      : []),
    ...(canCases && interventionCases.length > 0
      ? [{ key: "intervention", icon: AlertTriangle, label: "حالات تحتاج تدخلًا", count: interventionCases.length, href: "/admin/cases", tone: "critical" as const }]
      : []),
    ...(canAdmin && systemFailures.length > 0
      ? [{ key: "system", icon: Database, label: "خدمات نظام غير سليمة", count: systemFailures.length, href: "/admin/system-health", tone: "critical" as const }]
      : []),
    ...(canCases && kpis.overdueFollowUps > 0
      ? [{ key: "followups", icon: ClipboardList, label: "متابعات متأخرة", count: kpis.overdueFollowUps, href: "/admin/follow-ups?status=overdue", tone: "routine" as const }]
      : []),
    ...(canReview && recentApplications.length > 0
      ? [{ key: "applications", icon: ClipboardCheck, label: "طلبات انضمام بانتظار المراجعة", count: recentApplications.length, href: "/admin/applications", tone: "routine" as const }]
      : []),
    ...(canFinance && pendingPayments.length + openRefunds.length > 0
      ? [{ key: "payments", icon: Wallet, label: "مدفوعات واسترجاعات معلّقة", count: pendingPayments.length + openRefunds.length, href: "/admin/finance", tone: "routine" as const }]
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
    ...(canFinance ? [collectedStat(kpis.paidTotals ?? [])] : []),
  ]

  const nowLabel = new Date().toLocaleString("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" })
  const totalActivity = activity30d.reduce((sum, d) => sum + d.newCases + d.paidPayments, 0)
  const chartWorthShowing = activity30d.length > 0 && totalActivity >= MIN_CHART_ACTIVITY

  // One merged, prioritized queue instead of four separate near-empty
  // list panels — every row is something a human has to act on. Ordered
  // safety → cases → applications → finance, then capped: the dashboard
  // shows the top of the queue, each item's own page shows the rest.
  const allWork: WorkItem[] = [
    ...(canSafety
      ? highPrioritySafety.map((a) => ({
          key: `safety-${a.id}`,
          kind: "تنبيه سلامة",
          href: `/dashboard/cases/${a.caseId}`,
          title: safeName(a.patientName),
          subtitle: a.summary ?? "تنبيه سلامة يحتاج تواصلًا سريعًا",
          badge: safetyAlertSeverityAr(a.severity),
          badgeVariant: "destructive" as const,
        }))
      : []),
    ...(canCases
      ? interventionCases.map((c) => ({
          key: `case-${c.id}`,
          kind: "حالة",
          href: `/dashboard/cases/${c.id}`,
          title: `${safeName(c.patientName)} — ${c.procedureName}`,
          subtitle: c.reason,
          badge: caseStatusAr(c.status),
          badgeVariant: "outline" as const,
        }))
      : []),
    ...(canReview
      ? recentApplications.map((a) => ({
          key: `app-${a.id}`,
          kind: "طلب انضمام",
          href: "/admin/applications",
          title: safeName(a.applicantName),
          subtitle: a.kind === "DOCTOR" ? "طلب طبيب بانتظار المراجعة" : "طلب مركز بانتظار المراجعة",
          badge: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("ar-SA-u-nu-latn") : "—",
          badgeVariant: "secondary" as const,
        }))
      : []),
    ...(canFinance
      ? [
          ...pendingPayments.map((p) => ({
            key: `pay-${p.id}`,
            kind: "دفعة",
            href: "/admin/finance",
            title: safeName(p.payerName),
            subtitle: `${paymentPurposeAr(p.purpose)} — ${formatMoney(p.amount, p.currency)}`,
            badge: "معلّقة",
            badgeVariant: "secondary" as const,
          })),
          ...openRefunds.map((r) => ({
            key: `refund-${r.id}`,
            kind: "استرجاع",
            href: "/admin/finance#refunds",
            title: safeName(r.requestedByName),
            subtitle: `استرجاع — ${formatMoney(r.amount, r.currency)}`,
            badge: "بانتظار المعالجة",
            badgeVariant: "secondary" as const,
          })),
        ]
      : []),
  ]
  const WORK_QUEUE_LIMIT = 7
  const workQueue = allWork.slice(0, WORK_QUEUE_LIMIT)

  return (
    <div className="space-y-5">
      {/* Title, context, last-update and primary action in one balanced row */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            مرحبًا، {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            حركة المنصة والمهام التي تحتاج متابعة
            <span className="mx-2 text-border">·</span>
            <span className="text-muted-foreground/80">آخر تحديث {nowLabel}</span>
          </p>
        </div>
        {canCases && (
          <Link
            href="/admin/cases"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <FileHeart className="size-[18px]" /> إدارة الحالات
          </Link>
        )}
      </div>

      {stats.length > 0 && <StatStrip stats={stats} />}

      <WorkspacePanel
        main={
          <>
            {(canSafety || canCases || canReview || canFinance || canAdmin) && (
              <CommandCenter items={attentionItems} />
            )}

            {workQueue.length > 0 && (
              <WorkspaceSection
                title="قائمة العمل"
                description={
                  allWork.length > workQueue.length
                    ? `أهم ${workQueue.length.toLocaleString("ar-SA-u-nu-latn")} من ${allWork.length.toLocaleString("ar-SA-u-nu-latn")} عنصرًا ينتظر معالجة`
                    : "العناصر التي تنتظر قرارًا أو معالجة"
                }
                icon={ClipboardList}
              >
                <ul className="divide-y divide-border/60">
                  {workQueue.map((w) => (
                    <li key={w.key}>
                      <Link
                        href={w.href}
                        className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{w.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{w.subtitle}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="hidden text-[11px] font-medium text-muted-foreground/70 sm:inline">{w.kind}</span>
                          <Badge variant={w.badgeVariant}>{w.badge}</Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </WorkspaceSection>
            )}

            {canCases && (
              <WorkspaceSection
                title="النشاط خلال آخر 30 يومًا"
                description="حالات جديدة ودفعات ناجحة"
                viewAllHref={canAudit ? "/admin/activity" : undefined}
              >
                {chartWorthShowing ? (
                  <div className="p-3">
                    <ActivityChart data={activity30d} showFinance={canFinance} />
                  </div>
                ) : (
                  <WorkspaceEmpty text="لا يوجد نشاط كافٍ لعرض اتجاه خلال آخر 30 يومًا بعد." />
                )}
              </WorkspaceSection>
            )}
          </>
        }
        side={
          <>
            <QuickActionsGrid perms={perms} />

            {canAdmin && systemChecks.length > 0 && (
              <WorkspaceSection title="حالة النظام" viewAllHref="/admin/system-health">
                <div className="divide-y divide-border/60">
                  {systemChecks.map((c) => (
                    <div key={c.key} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                      <c.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium text-foreground">{c.label}</span>
                      {c.ok ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-destructive" />
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
                      <Link key={a.id} href="/admin/activity" className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{a.actorName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.count > 1 ? `${a.actionLabel} — ${a.count.toLocaleString("ar-SA-u-nu-latn")} مرات اليوم` : a.actionLabel}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
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
      <div className="divide-y divide-border/60">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
          >
            <a.icon className="size-[18px] shrink-0 text-primary" />
            <span className="flex-1 truncate">{a.label}</span>
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground/60 ltr:rotate-180" />
          </Link>
        ))}
      </div>
    </WorkspaceSection>
  )
}
