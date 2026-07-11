import Link from "next/link"
import {
  Users, FileHeart, Activity, AlertTriangle, ClipboardCheck, Stethoscope,
  Building2, ClipboardList, ShieldAlert, Wallet, Undo2, Bell,
  CheckCircle2, XCircle, Database, Plug,
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
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import { listRecentActivity } from "@/lib/data/admin-activity"
import { listRefundRequestsFinance, listPayments } from "@/lib/data/finance"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { getMigrationStatus } from "@/lib/db/migration-status"
import { isStripeConfigured, isR2Configured, isEmailConfigured } from "@/lib/env"
import { Badge } from "@/components/ui/badge"
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="نظرة عامة تشغيلية"
        title={`مرحبًا، ${user.name}`}
        description="ملخّص واضح لحركة المنصة والمهام التي تحتاج متابعة، مع عرض الأقسام المناسبة لصلاحياتك."
      />

      {/* Hero metrics — larger, more prominent */}
      {canCases && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Users}
            label="إجمالي المرضى"
            value={kpis.totalPatients.toLocaleString("ar-SA-u-nu-latn")}
            hint="مسجّلون على المنصة"
            tone="primary"
            emphasis
          />
          <MetricCard
            icon={FileHeart}
            label="حالات جديدة"
            value={kpis.newCasesThisWeek.toLocaleString("ar-SA-u-nu-latn")}
            hint="خلال آخر ٧ أيام"
            tone="success"
            emphasis
          />
          <MetricCard
            icon={Activity}
            label="الحالات النشطة"
            value={kpis.activeCases.toLocaleString("ar-SA-u-nu-latn")}
            hint="في أي مرحلة قبل الإغلاق"
            href="/admin/cases"
            tone="primary"
            emphasis
          />
          <MetricCard
            icon={AlertTriangle}
            label="تحتاج تدخلًا"
            value={kpis.casesNeedingIntervention.toLocaleString("ar-SA-u-nu-latn")}
            hint={kpis.casesNeedingIntervention > 0 ? "افتح قائمة الحالات الحرجة" : "كل شيء على ما يرام"}
            href="/admin/cases"
            tone={kpis.casesNeedingIntervention > 0 ? "danger" : "success"}
            emphasis
          />
        </div>
      )}

      {/* Secondary metrics — smaller */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canReview && (
          <>
            <MetricCard
              icon={ClipboardCheck}
              label="طلبات انضمام"
              value={kpis.pendingApplications.toLocaleString("ar-SA-u-nu-latn")}
              hint={kpis.pendingApplications > 0 ? "بانتظار المراجعة" : "لا طلبات معلّقة"}
              href="/admin/applications"
              tone={kpis.pendingApplications > 0 ? "warning" : "neutral"}
            />
            <MetricCard
              icon={Stethoscope}
              label="أطباء معتمدون"
              value={kpis.approvedDoctors.toLocaleString("ar-SA-u-nu-latn")}
              href="/admin/doctors"
              tone="neutral"
            />
            <MetricCard
              icon={Building2}
              label="مراكز معتمدة"
              value={kpis.approvedCenters.toLocaleString("ar-SA-u-nu-latn")}
              href="/admin/centers"
              tone="neutral"
            />
          </>
        )}
        {canCases && (
          <MetricCard
            icon={ClipboardList}
            label="متابعات متأخرة"
            value={kpis.overdueFollowUps.toLocaleString("ar-SA-u-nu-latn")}
            href="/admin/follow-ups"
            tone={kpis.overdueFollowUps > 0 ? "warning" : "neutral"}
          />
        )}
        {canSafety && (
          <MetricCard
            icon={ShieldAlert}
            label="تنبيهات سلامة مفتوحة"
            value={kpis.openSafetyAlerts.toLocaleString("ar-SA-u-nu-latn")}
            href="/admin/safety-alerts"
            tone={kpis.openSafetyAlerts > 0 ? "danger" : "success"}
          />
        )}
        {canFinance && (
          <>
            <MetricCard
              icon={Wallet}
              label="مدفوعات معلّقة"
              value={kpis.pendingPayments.toLocaleString("ar-SA-u-nu-latn")}
              href="/admin/finance"
              tone="warning"
            />
            <MetricCard
              icon={Wallet}
              label="إجمالي المحصّل"
              value={`${(kpis.totalPaidAmount ?? 0).toLocaleString("ar-SA-u-nu-latn")} ر.س`}
              href="/admin/finance"
              tone="success"
            />
            <MetricCard
              icon={Undo2}
              label="طلبات استرجاع"
              value={(kpis.openRefundRequests ?? 0).toLocaleString("ar-SA-u-nu-latn")}
              href="/admin/finance#refunds"
              tone={(kpis.openRefundRequests ?? 0) > 0 ? "warning" : "neutral"}
            />
          </>
        )}
        <MetricCard
          icon={Bell}
          label="إشعارات غير مقروءة"
          value={unreadNotifications.toLocaleString("ar-SA-u-nu-latn")}
          href="/dashboard/notifications"
          tone={unreadNotifications > 0 ? "warning" : "neutral"}
        />
      </div>

      {canCases && activity30d.length > 0 && (
        <SectionCard
          icon={Activity}
          title="النشاط خلال آخر 30 يومًا"
          description="حالات جديدة ودفعات ناجحة خلال الفترة الأخيرة."
        >
          <div className="p-5">
            <ActivityChart data={activity30d} showFinance={canFinance} />
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {canCases && (
          <SectionCard
            icon={AlertTriangle}
            title="حالات تحتاج تدخلًا الآن"
            description="حالات على وشك تجاوز المهلة أو تحمل علامة خطر."
            viewAllHref="/admin/cases"
            tone={interventionCases.length > 0 ? "danger" : "primary"}
          >
            {interventionCases.length === 0 ? (
              <EmptySection text="لا توجد حالات تحتاج تدخلًا حاليًا." />
            ) : (
              <ul className="divide-y divide-border/60">
                {interventionCases.map((c) => (
                  <ListRow key={c.id} href={`/dashboard/cases/${c.id}`} title={`${c.patientName} — ${c.procedureName}`} subtitle={c.reason} badge={caseStatusAr(c.status)} />
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {canReview && (
          <SectionCard
            icon={ClipboardCheck}
            title="أحدث طلبات الانضمام"
            description="طلبات الأطباء والمراكز بانتظار المراجعة."
            viewAllHref="/admin/applications"
            tone="primary"
          >
            {recentApplications.length === 0 ? (
              <EmptySection text="لا توجد طلبات انضمام معلّقة." />
            ) : (
              <ul className="divide-y divide-border/60">
                {recentApplications.map((a) => (
                  <ListRow key={a.id} href="/admin/applications" title={a.applicantName} subtitle={a.kind === "DOCTOR" ? "طلب طبيب" : "طلب مركز"} badge={a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("ar-SA-u-nu-latn") : "—"} />
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {canSafety && (
          <SectionCard
            icon={ShieldAlert}
            title="تنبيهات سلامة عالية الأولوية"
            description="حالات تحتاج تواصلًا سريعًا مع المريض."
            viewAllHref="/admin/safety-alerts"
            tone="danger"
          >
            {highPrioritySafety.length === 0 ? (
              <EmptySection text="لا توجد تنبيهات سلامة عالية الأولوية حاليًا." />
            ) : (
              <ul className="divide-y divide-border/60">
                {highPrioritySafety.map((a) => (
                  <ListRow key={a.id} href={`/dashboard/cases/${a.caseId}`} title={a.patientName} subtitle={a.summary ?? "تنبيه سلامة"} badge={safetyAlertSeverityAr(a.severity)} badgeVariant="destructive" />
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {canFinance && (
          <SectionCard
            icon={Wallet}
            title="مدفوعات واسترجاعات معلّقة"
            description="بانتظار المعالجة اليدوية أو تأكيد المزوّد."
            viewAllHref="/admin/finance"
            tone="warning"
          >
            {pendingPayments.length === 0 && openRefunds.length === 0 ? (
              <EmptySection text="لا توجد مدفوعات أو استرجاعات معلّقة." />
            ) : (
              <ul className="divide-y divide-border/60">
                {pendingPayments.map((p) => (
                  <ListRow key={p.id} href="/admin/finance" title={p.payerName} subtitle={`${paymentPurposeAr(p.purpose)} — ${Number(p.amount).toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(p.currency)}`} badge="معلّقة" />
                ))}
                {openRefunds.map((r) => (
                  <ListRow key={r.id} href="/admin/finance#refunds" title={r.requestedByName} subtitle={`استرجاع — ${Number(r.amount).toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(r.currency)}`} badge="بانتظار المعالجة" />
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {canAudit && (
          <SectionCard
            icon={Activity}
            title="آخر النشاطات"
            description="أحدث ٨ أحداث في سجل التدقيق."
            viewAllHref="/admin/activity"
            tone="neutral"
          >
            {recentActivity.length === 0 ? (
              <EmptySection text="لا يوجد نشاط مسجّل بعد." />
            ) : (
              <ul className="divide-y divide-border/60">
                {recentActivity.map((a) => (
                  <ListRow key={a.id} href="/admin/activity" title={a.actorName ?? "النظام"} subtitle={a.action} badge={new Date(a.createdAt).toLocaleString("ar-SA-u-nu-latn")} />
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {canAdmin && dbStatus && (
          <SectionCard
            icon={Database}
            title="حالة النظام"
            description="جاهزية الخدمات الأساسية للمنصة."
            viewAllHref="/admin/system-health"
            tone="success"
          >
            <div className="space-y-2 p-5 text-sm">
              <StatusRow label="حفظ البيانات" ok={dbStatus.connected && dbStatus.ready} />
              <StatusRow label="بوابة الدفع الإلكتروني" ok={isStripeConfigured()} />
              <StatusRow label="التخزين السحابي للملفات" ok={isR2Configured()} />
              <StatusRow label="البريد" ok={isEmailConfigured()} />
            </div>
          </SectionCard>
        )}
      </div>

      <QuickActions perms={perms} />
    </div>
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
    { href: "/admin/finance", label: "لوحة المالية", icon: Wallet, show: perms.has(PERMISSIONS.FINANCE_ACCESS) },
    { href: "/admin/concierge", label: "لوحة المتابعة التشغيلية", icon: Plug, show: perms.has(PERMISSIONS.CONCIERGE_ACCESS) },
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
