import Link from "next/link"
import {
  Users, FileHeart, Activity, AlertTriangle, ClipboardCheck, Stethoscope,
  Building2, ClipboardList, ShieldAlert, Wallet, Bell,
  CheckCircle2, XCircle, Database, Plug, CheckCheck, Mail, HardDrive, CreditCard,
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
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import { listRecentActivity } from "@/lib/data/admin-activity"
import { listRefundRequestsFinance, listPayments } from "@/lib/data/finance"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { getMigrationStatus } from "@/lib/db/migration-status"
import { isStripeConfigured, isR2Configured, isEmailConfigured } from "@/lib/env"
import { Badge } from "@/components/ui/badge"
import { caseStatusAr, paymentPurposeAr, currencyAr, safetyAlertSeverityAr } from "@/lib/status-labels"
import { actionLabelAr } from "@/lib/audit-labels"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** A stored name that's already corrupted (e.g. lost in a bad encoding
 *  round-trip somewhere upstream) shouldn't render as raw "????" in a
 *  professional admin surface — show an honest "unknown" label instead. */
function safeName(name: string, fallback = "مستخدم غير معروف"): string {
  const trimmed = name.trim()
  return !trimmed || /^[?？\s]+$/.test(trimmed) ? fallback : name
}

type ActivityRow = { id: string; actorName: string | null; action: string; createdAt: Date }

/** Collapses repeated same-actor/same-action/same-day rows (e.g. eight
 *  identical "logged in" audit entries) into one row with a count, instead
 *  of listing every occurrence — same source data, just not restated. */
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
  return groups.sort((a, b) => b.latest.getTime() - a.latest.getTime()).slice(0, 5)
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

  const [kpis, activity30d, interventionCases, recentApplications, highPrioritySafety, recentActivity, refunds, pendingPaymentsList, dbStatus, unreadNotifications] =
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
      getUnreadNotificationCount(user.id),
    ])
  const pendingPayments = pendingPaymentsList.filter((p) => ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(p.status)).slice(0, 6)
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

  // Everything in "Needs attention", one prioritized list — an item only
  // exists here if its count is greater than zero.
  type AttentionItem = { key: string; icon: React.ComponentType<{ className?: string }>; label: string; count: number; href: string }
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

  const nowLabel = new Date().toLocaleString("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="space-y-5">
      {/* 1. Compact header — no card wrapper, no repeated breadcrumb */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">نظرة عامة تشغيلية</p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-[26px]">مرحبًا، {user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">حركة المنصة والمهام التي تحتاج متابعة · آخر تحديث {nowLabel}</p>
        </div>
        {canCases && (
          <Link href="/admin/cases" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <FileHeart className="size-4" /> إدارة الحالات
          </Link>
        )}
      </div>

      {/* 2. Executive summary — one primary indicator, three smaller ones.
          On mobile the primary spans both columns (full width); the rest
          share a 2-column grid instead of stacking one-per-row. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <MetricCard
            icon={AlertTriangle}
            label="حالات تحتاج تدخلًا"
            value={kpis.casesNeedingIntervention.toLocaleString("ar-SA-u-nu-latn")}
            hint={kpis.casesNeedingIntervention > 0 ? "افتح قائمة الحالات الحرجة" : "كل شيء على ما يرام"}
            href="/admin/cases"
            tone={kpis.casesNeedingIntervention > 0 ? "danger" : "success"}
            emphasis
          />
        </div>
        <MetricCard icon={Users} label="إجمالي المرضى" value={kpis.totalPatients.toLocaleString("ar-SA-u-nu-latn")} hint="مسجّلون على المنصة" tone="neutral" />
        {canReview && (
          <MetricCard
            icon={ClipboardCheck}
            label="طلبات معلّقة"
            value={kpis.pendingApplications.toLocaleString("ar-SA-u-nu-latn")}
            hint={kpis.pendingApplications > 0 ? "بانتظار المراجعة" : "لا طلبات معلّقة"}
            href="/admin/applications"
            tone={kpis.pendingApplications > 0 ? "warning" : "neutral"}
          />
        )}
        {canFinance && (
          <MetricCard icon={Wallet} label="إجمالي المحصّل" value={`${(kpis.totalPaidAmount ?? 0).toLocaleString("ar-SA-u-nu-latn")} ر.س`} href="/admin/finance" tone="success" />
        )}
      </div>

      {/* 3. Attention center — compact, prioritized rows; nothing rendered
          for a zero count, one calm line if the whole list is empty. */}
      {(canSafety || canCases || canReview || canFinance || canAdmin) && (
        <SectionCard
          icon={AlertTriangle}
          title="يحتاج إلى انتباه"
          description="كل ما يحتاج قرارًا منك الآن، مرتّبًا حسب الأولوية."
          tone={attentionItems.length > 0 ? "danger" : "success"}
        >
          {attentionItems.length === 0 ? (
            <EmptySection icon={CheckCheck} text="لا توجد عناصر تحتاج تدخلًا الآن — كل شيء تحت السيطرة." />
          ) : (
            <ul className="divide-y divide-border/60">
              {attentionItems.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                    <div className="flex items-center gap-2.5">
                      <item.icon className="size-4 shrink-0 text-destructive" />
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    </div>
                    <Badge variant="destructive">{item.count.toLocaleString("ar-SA-u-nu-latn")}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* 4. Main grid — wide working column + narrow side column */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {canCases && (
            <SectionCard icon={Activity} title="النشاط خلال آخر 30 يومًا" description="حالات جديدة ودفعات ناجحة.">
              <div className="p-4">
                {activity30d.length > 0 ? (
                  <ActivityChart data={activity30d} showFinance={canFinance} />
                ) : (
                  <EmptySection icon={Activity} text="لا يوجد نشاط كافٍ لعرض اتجاه خلال آخر 30 يومًا بعد." />
                )}
              </div>
            </SectionCard>
          )}

          {canCases && (
            <SectionCard icon={FileHeart} title="حالات تحتاج مراجعة" viewAllHref="/admin/cases" description="أحدث الحالات على وشك تجاوز المهلة أو تحمل علامة خطر.">
              {interventionCases.length === 0 ? (
                <EmptySection text="لا توجد حالات تحتاج تدخلًا حاليًا." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {interventionCases.map((c) => (
                    <ListRow key={c.id} href={`/dashboard/cases/${c.id}`} title={`${safeName(c.patientName)} — ${c.procedureName}`} subtitle={c.reason} badge={caseStatusAr(c.status)} />
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {canReview && (
            <SectionCard icon={ClipboardCheck} title="أحدث طلبات الانضمام" viewAllHref="/admin/applications" description="طلبات الأطباء والمراكز بانتظار المراجعة.">
              {recentApplications.length === 0 ? (
                <EmptySection text="لا توجد طلبات انضمام معلّقة." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {recentApplications.map((a) => (
                    <ListRow key={a.id} href="/admin/applications" title={safeName(a.applicantName)} subtitle={a.kind === "DOCTOR" ? "طلب طبيب" : "طلب مركز"} badge={a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("ar-SA-u-nu-latn") : "—"} />
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {canFinance && (
            <SectionCard icon={Wallet} title="مدفوعات واسترجاعات معلّقة" viewAllHref="/admin/finance" description="بانتظار المعالجة اليدوية أو تأكيد المزوّد.">
              {pendingPayments.length === 0 && openRefunds.length === 0 ? (
                <EmptySection text="لا توجد مدفوعات أو استرجاعات معلّقة." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {pendingPayments.map((p) => (
                    <ListRow key={p.id} href="/admin/finance" title={safeName(p.payerName)} subtitle={`${paymentPurposeAr(p.purpose)} — ${Number(p.amount).toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(p.currency)}`} badge="معلّقة" />
                  ))}
                  {openRefunds.map((r) => (
                    <ListRow key={r.id} href="/admin/finance#refunds" title={safeName(r.requestedByName)} subtitle={`استرجاع — ${Number(r.amount).toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(r.currency)}`} badge="بانتظار المعالجة" />
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {canSafety && (
            <SectionCard icon={ShieldAlert} title="تنبيهات سلامة عالية الأولوية" viewAllHref="/admin/safety-alerts" description="حالات تحتاج تواصلًا سريعًا مع المريض.">
              {highPrioritySafety.length === 0 ? (
                <EmptySection text="لا توجد تنبيهات سلامة عالية الأولوية حاليًا." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {highPrioritySafety.map((a) => (
                    <ListRow key={a.id} href={`/dashboard/cases/${a.caseId}`} title={safeName(a.patientName)} subtitle={a.summary ?? "تنبيه سلامة"} badge={safetyAlertSeverityAr(a.severity)} badgeVariant="destructive" />
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>

        <div className="space-y-4 lg:col-span-1">
          <QuickActions perms={perms} />

          {canAdmin && systemChecks.length > 0 && (
            <SectionCard icon={Database} title="حالة النظام" viewAllHref="/admin/system-health">
              <div className="grid grid-cols-2 gap-2 p-4">
                {systemChecks.map((c) => (
                  <div key={c.key} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium", c.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    <c.icon className="size-3.5 shrink-0" />
                    <span className="truncate">{c.label}</span>
                    {c.ok ? <CheckCircle2 className="ms-auto size-3.5 shrink-0" /> : <XCircle className="ms-auto size-3.5 shrink-0" />}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {canAudit && (
            <SectionCard icon={Activity} title="آخر النشاطات" viewAllHref="/admin/activity" tone="neutral">
              {activitySummary.length === 0 ? (
                <EmptySection text="لا يوجد نشاط مسجّل بعد." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {activitySummary.map((a) => (
                    <ListRow
                      key={a.id}
                      href="/admin/activity"
                      title={a.actorName}
                      subtitle={a.count > 1 ? `${a.actionLabel} — ${a.count.toLocaleString("ar-SA-u-nu-latn")} مرات اليوم` : a.actionLabel}
                      badge={a.latest.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
                    />
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {/* Secondary, informational-only figures — a compact strip, not
              individual cards, since nothing here needs a decision. */}
          {(canReview || unreadNotifications > 0) && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-xs">
              {canReview && (
                <>
                  <StatChip icon={Stethoscope} label="أطباء معتمدون" value={kpis.approvedDoctors} />
                  <StatChip icon={Building2} label="مراكز معتمدة" value={kpis.approvedCenters} />
                </>
              )}
              <StatChip icon={Bell} label="إشعارات غير مقروءة" value={unreadNotifications} href="/dashboard/notifications" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatChip({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; href?: string }) {
  const content = (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon className="size-3.5 text-primary/70" />
      {label}
      <span className="font-heading font-bold tabular-nums text-foreground">{value.toLocaleString("ar-SA-u-nu-latn")}</span>
    </span>
  )
  return href ? <Link href={href} className="transition-colors hover:text-foreground">{content}</Link> : content
}

function EmptySection({ text, icon: Icon }: { text: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      {Icon && (
        <span className="flex size-9 items-center justify-center rounded-full bg-success/12 text-success">
          <Icon className="size-[18px]" />
        </span>
      )}
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function ListRow({
  href,
  title,
  subtitle,
  badge,
  badgeVariant = "outline",
}: {
  href: string
  title: string
  subtitle: string
  badge: string
  badgeVariant?: "outline" | "secondary" | "destructive" | "default"
}) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant={badgeVariant} className="shrink-0">{badge}</Badge>
      </Link>
    </li>
  )
}

function QuickActions({ perms }: { perms: Set<string> }) {
  const actions: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; show: boolean }[] = [
    { href: "/admin/applications", label: "مراجعة طلبات الانضمام", icon: ClipboardCheck, show: perms.has(PERMISSIONS.PROVIDER_REVIEW) },
    { href: "/admin/cases", label: "إدارة الحالات", icon: FileHeart, show: perms.has(PERMISSIONS.CASE_READ_ANY) },
    { href: "/admin/safety-alerts", label: "تنبيهات السلامة", icon: ShieldAlert, show: perms.has(PERMISSIONS.SAFETY_ALERT_MANAGE) },
    { href: "/admin/finance", label: "لوحة المالية", icon: Wallet, show: perms.has(PERMISSIONS.FINANCE_ACCESS) },
    { href: "/admin/concierge", label: "لوحة المتابعة التشغيلية", icon: Plug, show: perms.has(PERMISSIONS.CONCIERGE_ACCESS) },
  ].filter((a) => a.show)

  if (actions.length === 0) return null
  return (
    <SectionCard icon={Plug} title="إجراءات سريعة">
      <div className="flex flex-col gap-1 p-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <a.icon className="size-4 text-primary" /> {a.label}
          </Link>
        ))}
      </div>
    </SectionCard>
  )
}
