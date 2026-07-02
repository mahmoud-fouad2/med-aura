import Link from "next/link"
import {
  Users, FileHeart, Activity, AlertTriangle, ClipboardCheck, Stethoscope,
  Building2, ClipboardList, ShieldAlert, Wallet, Undo2, Bell, ArrowLeft,
  CheckCircle2, XCircle, Database, Plug,
} from "lucide-react"
import { requireAuthPage } from "@/lib/session"
import { getUserPermissions, PERMISSIONS } from "@/lib/rbac"
import {
  getAdminOverviewKpis,
  listCasesNeedingIntervention,
  listRecentApplications,
  listHighPrioritySafetyAlerts,
} from "@/lib/data/admin-overview"
import { listRecentActivity } from "@/lib/data/admin-activity"
import { listRefundRequestsFinance, listPayments } from "@/lib/data/finance"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { getMigrationStatus } from "@/lib/db/migration-status"
import { isStripeConfigured, isR2Configured, isEmailConfigured } from "@/lib/env"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { caseStatusAr, paymentPurposeAr, currencyAr, safetyAlertSeverityAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export default async function AdminOverviewPage() {
  const user = await requireAuthPage("/admin")
  const perms = await getUserPermissions(user.id)
  const canFinance = perms.has(PERMISSIONS.FINANCE_ACCESS)
  const canCases = perms.has(PERMISSIONS.CASE_READ_ANY)
  const canReview = perms.has(PERMISSIONS.PROVIDER_REVIEW)
  const canSafety = perms.has(PERMISSIONS.SAFETY_ALERT_MANAGE)
  const canAudit = perms.has(PERMISSIONS.AUDIT_READ)
  const canAdmin = perms.has(PERMISSIONS.ADMIN_ACCESS)

  const [kpis, interventionCases, recentApplications, highPrioritySafety, recentActivity, refunds, pendingPaymentsList, dbStatus, unreadNotifications] =
    await Promise.all([
      getAdminOverviewKpis(canFinance),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">نظرة عامة</h1>
        <p className="mt-1 text-muted-foreground">مرحبًا {user.name} — هذا ملخص التشغيل الحالي لمنصة Med Aura.</p>
      </div>

      {/* KPI grid — every number is a live DB aggregate, zero when there's no data */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {canCases && (
          <>
            <Kpi icon={Users} label="إجمالي المرضى" value={kpis.totalPatients} />
            <Kpi icon={FileHeart} label="حالات جديدة (٧ أيام)" value={kpis.newCasesThisWeek} />
            <Kpi icon={Activity} label="الحالات النشطة" value={kpis.activeCases} href="/admin/cases" />
            <Kpi icon={AlertTriangle} label="تحتاج تدخلًا" value={kpis.casesNeedingIntervention} warn href="/admin/cases" />
          </>
        )}
        {canReview && (
          <>
            <Kpi icon={ClipboardCheck} label="طلبات انضمام معلّقة" value={kpis.pendingApplications} warn={kpis.pendingApplications > 0} href="/admin/applications" />
            <Kpi icon={Stethoscope} label="الأطباء المعتمدون" value={kpis.approvedDoctors} href="/admin/doctors" />
            <Kpi icon={Building2} label="المراكز المعتمدة" value={kpis.approvedCenters} href="/admin/centers" />
          </>
        )}
        {canCases && <Kpi icon={ClipboardList} label="متابعات متأخرة" value={kpis.overdueFollowUps} warn={kpis.overdueFollowUps > 0} href="/admin/follow-ups" />}
        {canSafety && <Kpi icon={ShieldAlert} label="تنبيهات سلامة مفتوحة" value={kpis.openSafetyAlerts} warn={kpis.openSafetyAlerts > 0} href="/admin/safety-alerts" />}
        {canFinance && (
          <>
            <Kpi icon={Wallet} label="مدفوعات معلّقة" value={kpis.pendingPayments} href="/dashboard/finance" />
            <Kpi icon={Wallet} label="إجمالي المحصّل" value={`${(kpis.totalPaidAmount ?? 0).toLocaleString("ar-SA")} ر.س`} href="/dashboard/finance" />
            <Kpi icon={Undo2} label="طلبات استرجاع مفتوحة" value={kpis.openRefundRequests ?? 0} warn={(kpis.openRefundRequests ?? 0) > 0} href="/dashboard/finance#refunds" />
          </>
        )}
        <Kpi icon={Bell} label="إشعاراتك غير المقروءة" value={unreadNotifications} href="/dashboard/notifications" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {canCases && (
          <Section title="حالات تحتاج تدخلًا الآن" icon={AlertTriangle} viewAllHref="/admin/cases">
            {interventionCases.length === 0 ? (
              <EmptySection text="لا توجد حالات تحتاج تدخلًا حاليًا." />
            ) : (
              <ul className="divide-y divide-border">
                {interventionCases.map((c) => (
                  <ListRow key={c.id} href={`/dashboard/cases/${c.id}`} title={`${c.patientName} — ${c.procedureName}`} subtitle={c.reason} badge={caseStatusAr(c.status)} />
                ))}
              </ul>
            )}
          </Section>
        )}

        {canReview && (
          <Section title="أحدث طلبات الانضمام" icon={ClipboardCheck} viewAllHref="/admin/applications">
            {recentApplications.length === 0 ? (
              <EmptySection text="لا توجد طلبات انضمام معلّقة." />
            ) : (
              <ul className="divide-y divide-border">
                {recentApplications.map((a) => (
                  <ListRow key={a.id} href="/admin/applications" title={a.applicantName} subtitle={a.kind === "DOCTOR" ? "طلب طبيب" : "طلب مركز"} badge={a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("ar-SA") : "—"} />
                ))}
              </ul>
            )}
          </Section>
        )}

        {canSafety && (
          <Section title="تنبيهات سلامة عالية الأولوية" icon={ShieldAlert} viewAllHref="/admin/safety-alerts">
            {highPrioritySafety.length === 0 ? (
              <EmptySection text="لا توجد تنبيهات سلامة عالية الأولوية حاليًا." />
            ) : (
              <ul className="divide-y divide-border">
                {highPrioritySafety.map((a) => (
                  <ListRow key={a.id} href={`/dashboard/cases/${a.caseId}`} title={a.patientName} subtitle={a.summary ?? "تنبيه سلامة"} badge={safetyAlertSeverityAr(a.severity)} badgeVariant="destructive" />
                ))}
              </ul>
            )}
          </Section>
        )}

        {canFinance && (
          <Section title="مدفوعات واسترجاعات معلّقة" icon={Wallet} viewAllHref="/dashboard/finance">
            {pendingPayments.length === 0 && openRefunds.length === 0 ? (
              <EmptySection text="لا توجد مدفوعات أو استرجاعات معلّقة." />
            ) : (
              <ul className="divide-y divide-border">
                {pendingPayments.map((p) => (
                  <ListRow key={p.id} href="/dashboard/finance" title={p.payerName} subtitle={`${paymentPurposeAr(p.purpose)} — ${Number(p.amount).toLocaleString("ar-SA")} ${currencyAr(p.currency)}`} badge="معلّقة" />
                ))}
                {openRefunds.map((r) => (
                  <ListRow key={r.id} href="/dashboard/finance#refunds" title={r.requestedByName} subtitle={`استرجاع — ${Number(r.amount).toLocaleString("ar-SA")} ${currencyAr(r.currency)}`} badge="بانتظار المعالجة" />
                ))}
              </ul>
            )}
          </Section>
        )}

        {canAudit && (
          <Section title="آخر النشاطات" icon={Activity} viewAllHref="/admin/activity">
            {recentActivity.length === 0 ? (
              <EmptySection text="لا يوجد نشاط مسجّل بعد." />
            ) : (
              <ul className="divide-y divide-border">
                {recentActivity.map((a) => (
                  <ListRow key={a.id} href="/admin/activity" title={a.actorName ?? "النظام"} subtitle={a.action} badge={new Date(a.createdAt).toLocaleString("ar-SA")} />
                ))}
              </ul>
            )}
          </Section>
        )}

        {canAdmin && dbStatus && (
          <Section title="حالة النظام" icon={Database} viewAllHref="/admin/system-health">
            <div className="space-y-2 p-4 text-sm">
              <StatusRow label="قاعدة البيانات" ok={dbStatus.connected && dbStatus.ready} />
              <StatusRow label="بوابة الدفع (Stripe)" ok={isStripeConfigured()} />
              <StatusRow label="التخزين (R2)" ok={isR2Configured()} />
              <StatusRow label="البريد" ok={isEmailConfigured()} />
            </div>
          </Section>
        )}
      </div>

      <QuickActions perms={perms} />
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  warn,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  warn?: boolean
  href?: string
}) {
  const body = (
    <Card className={`space-y-1.5 p-4 transition-colors ${href ? "hover:border-primary/40" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-4 ${warn ? "text-warning" : ""}`} />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`font-heading text-xl font-bold ${warn ? "text-warning" : "text-foreground"}`}>{value}</p>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

function Section({
  title,
  icon: Icon,
  viewAllHref,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  viewAllHref: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
          <Icon className="size-4 text-primary" /> {title}
        </h2>
        <Link href={viewAllHref} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          عرض الكل <ArrowLeft className="size-3" />
        </Link>
      </div>
      {children}
    </Card>
  )
}

function EmptySection({ text }: { text: string }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{text}</p>
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
      <Link href={href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant={badgeVariant} className="shrink-0">{badge}</Badge>
      </Link>
    </li>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 font-medium ${ok ? "text-success" : "text-destructive"}`}>
        {ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
        {ok ? "سليم" : "غير متاح"}
      </span>
    </div>
  )
}

function QuickActions({ perms }: { perms: Set<string> }) {
  const actions: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; show: boolean }[] = [
    { href: "/admin/applications", label: "مراجعة طلبات الانضمام", icon: ClipboardCheck, show: perms.has(PERMISSIONS.PROVIDER_REVIEW) },
    { href: "/admin/cases", label: "إدارة الحالات", icon: FileHeart, show: perms.has(PERMISSIONS.CASE_READ_ANY) },
    { href: "/admin/safety-alerts", label: "تنبيهات السلامة", icon: ShieldAlert, show: perms.has(PERMISSIONS.SAFETY_ALERT_MANAGE) },
    { href: "/dashboard/finance", label: "لوحة المالية", icon: Wallet, show: perms.has(PERMISSIONS.FINANCE_ACCESS) },
    { href: "/dashboard/concierge", label: "لوحة المتابعة التشغيلية", icon: Plug, show: perms.has(PERMISSIONS.CONCIERGE_ACCESS) },
  ].filter((a) => a.show)

  if (actions.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 font-heading text-lg font-bold text-foreground">إجراءات سريعة</h2>
      <div className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <a.icon className="size-4 text-primary" /> {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
