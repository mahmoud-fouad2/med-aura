import Link from "next/link"
import {
  Building2,
  Users,
  FileText,
  CalendarClock,
  Wallet,
  ClipboardList,
  ShieldAlert,
  Star,
  ChevronLeft,
  Sparkles,
} from "lucide-react"
import { getCurrentUser, requirePermissionPage } from "@/lib/session"
import { resolveUserCenterIds, PERMISSIONS } from "@/lib/rbac"
import {
  listCenterCases,
  listCenterPeople,
  listCenterQuotes,
  listCenterBookings,
  listCenterInvoices,
  listCenterFollowUps,
  listCenterSafetyAlerts,
  listCenterReviews,
} from "@/lib/data/center-dashboard"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import {
  caseStatusAr,
  quoteStatusAr,
  procedureBookingStatusAr,
  invoiceStatusAr,
  followUpTaskStatusAr,
  safetyAlertSeverityAr,
  safetyAlertStatusAr,
  currencyAr,
  centerRoleAr,
} from "@/lib/status-labels"

export const dynamic = "force-dynamic"

const OPEN_SAFETY = new Set([
  "OPEN",
  "ACKNOWLEDGED",
  "CONTACTED",
  "PROVIDER_REVIEWED",
  "REFERRED_TO_EMERGENCY",
])

export default async function CenterDashboardPage() {
  await requirePermissionPage(PERMISSIONS.CENTER_DASHBOARD_ACCESS)
  const user = (await getCurrentUser())!
  const centerIds = await resolveUserCenterIds(user.id)

  if (centerIds.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          icon={Building2}
          title="لا يوجد مركز مرتبط بحسابك"
          description="لم يتم ربط حسابك بأي مركز بعد. تواصل مع مالك المركز لإضافتك كموظف أو مدير."
        />
      </div>
    )
  }

  const [
    cases,
    people,
    quotes,
    bookings,
    invoices,
    followUps,
    safetyAlerts,
    reviews,
  ] = await Promise.all([
    listCenterCases(centerIds),
    listCenterPeople(centerIds),
    listCenterQuotes(centerIds),
    listCenterBookings(centerIds),
    listCenterInvoices(centerIds),
    listCenterFollowUps(centerIds),
    listCenterSafetyAlerts(centerIds),
    listCenterReviews(centerIds),
  ])

  const activeCases = cases.filter(
    (c) => c.status !== "CLOSED" && c.status !== "CANCELLED",
  )
  const openSafety = safetyAlerts.filter((a) => OPEN_SAFETY.has(a.status))
  const outstandingInvoices = invoices.filter(
    (i) => Number(i.remainingAmount) > 0,
  )
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, i) => sum + Number(i.remainingAmount),
    0,
  )
  const outstandingCurrency = invoices[0]?.currency ?? "SAR"
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((s, r) => s + Number(r.overallRating), 0) /
          reviews.length
        ).toFixed(1)
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="لوحة المركز"
        title={`أهلًا، ${user.name}`}
        description="نظرة شاملة على الحالات، الفريق، عروض الأسعار، والمستحقات."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={FileText}
          label="حالات نشطة"
          value={activeCases.length.toLocaleString("ar-SA-u-nu-latn")}
          hint={`${cases.length - activeCases.length} مغلقة`}
          tone="primary"
          emphasis
        />
        <MetricCard
          icon={Users}
          label="أعضاء الفريق"
          value={people.length.toLocaleString("ar-SA-u-nu-latn")}
          hint="أطباء وموظفون مرتبطون بمركزك"
          tone="neutral"
          emphasis
        />
        <MetricCard
          icon={Wallet}
          label="مستحقات معلّقة"
          value={`${outstandingTotal.toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(outstandingCurrency)}`}
          hint={
            outstandingInvoices.length === 0
              ? "لا مستحقات"
              : `${outstandingInvoices.length} فاتورة غير مسدَّدة`
          }
          tone={outstandingInvoices.length > 0 ? "warning" : "success"}
          emphasis
        />
        <MetricCard
          icon={ShieldAlert}
          label="تنبيهات سلامة مفتوحة"
          value={openSafety.length.toLocaleString("ar-SA-u-nu-latn")}
          hint={
            openSafety.length === 0
              ? "لا تنبيهات مفتوحة"
              : "تحتاج معالجة فورية"
          }
          tone={openSafety.length > 0 ? "danger" : "success"}
          emphasis
        />
      </div>

      <Tabs defaultValue="cases">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cases">الحالات ({cases.length})</TabsTrigger>
          <TabsTrigger value="people">الفريق ({people.length})</TabsTrigger>
          <TabsTrigger value="quotes">العروض ({quotes.length})</TabsTrigger>
          <TabsTrigger value="bookings">
            الحجوزات ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">الفواتير ({invoices.length})</TabsTrigger>
          <TabsTrigger value="followups">
            المتابعة ({followUps.length})
          </TabsTrigger>
          <TabsTrigger value="safety">
            السلامة ({safetyAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            التقييمات{avgRating ? ` · ${avgRating}★` : ""} ({reviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-4">
          <SectionCard
            icon={FileText}
            title="الحالات"
            description="الحالات المرتبطة بمركزك مع حالة كل واحدة."
          >
            {cases.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Sparkles}
                  title="لا توجد حالات بعد"
                  description="ستظهر هنا حالات مرضاك بمجرد استقبالها."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {cases.slice(0, 40).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {c.patientName} — {c.procedureName}
                        </p>
                        <p dir="ltr" className="mt-0.5 text-xs text-muted-foreground">
                          {c.reference}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {caseStatusAr(c.status)}
                        </span>
                        <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <SectionCard icon={Users} title="الفريق" description="الأطباء والموظفون في مركزك.">
            {people.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Users}
                  title="لا يوجد فريق مسجّل"
                  description="أضف موظفين وأطباء ليظهروا هنا."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {people.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">
                        {p.name}
                      </span>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {centerRoleAr(p.role)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <SectionCard
            icon={FileText}
            title="عروض الأسعار"
            description="عروض الأسعار الصادرة عن مركزك."
          >
            {quotes.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={FileText}
                  title="لا توجد عروض أسعار بعد"
                  description="ستظهر هنا عروضك بمجرد إصدارها."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {quotes.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div>
                      <p dir="ltr" className="font-mono text-xs text-muted-foreground">
                        {q.quoteNumber}
                      </p>
                      <p className="mt-0.5 font-medium tabular-nums text-foreground">
                        {Number(q.total).toLocaleString("ar-SA-u-nu-latn")}{" "}
                        {currencyAr(q.currency)}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {quoteStatusAr(q.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <SectionCard
            icon={CalendarClock}
            title="حجوزات الإجراءات"
            description="حجوزات مؤكَّدة، معلّقة، أو منتهية."
            tone="success"
          >
            {bookings.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CalendarClock}
                  title="لا توجد حجوزات"
                  description="ستظهر هنا الحجوزات بمجرد تأكيدها."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/dashboard/cases/${b.caseId}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {b.patientName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {b.scheduledDate ?? "بدون موعد بعد"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          {procedureBookingStatusAr(b.status)}
                        </span>
                        <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <SectionCard
            icon={Wallet}
            title="الفواتير"
            description="فواتير الحالات مع المتبقي والحالة."
            tone="warning"
          >
            {invoices.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Wallet}
                  title="لا توجد فواتير بعد"
                  description="ستظهر هنا الفواتير بمجرد إصدارها."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {invoices.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div>
                      <p dir="ltr" className="font-mono text-xs text-muted-foreground">
                        {i.invoiceNumber}
                      </p>
                      <p
                        className={
                          "mt-0.5 tabular-nums font-medium " +
                          (Number(i.remainingAmount) > 0
                            ? "text-warning-foreground"
                            : "text-success")
                        }
                      >
                        متبقي {Number(i.remainingAmount).toLocaleString("ar-SA-u-nu-latn")}{" "}
                        {currencyAr(i.currency)}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {invoiceStatusAr(i.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <SectionCard
            icon={ClipboardList}
            title="مهام المتابعة"
            description="مهام ما بعد الإجراء المسندة لفريق المركز."
          >
            {followUps.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={ClipboardList}
                  title="لا توجد مهام متابعة"
                  description="ستظهر هنا مهام المتابعة بمجرد جدولتها."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {followUps.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/dashboard/cases/${f.caseId}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-foreground">{f.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {f.dueAt
                            ? new Date(f.dueAt).toLocaleDateString("ar-SA-u-nu-latn")
                            : "بدون موعد استحقاق"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                            (f.status === "MISSED" || f.status === "ESCALATED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary")
                          }
                        >
                          {followUpTaskStatusAr(f.status)}
                        </span>
                        <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="safety" className="mt-4">
          <SectionCard
            icon={ShieldAlert}
            title="تنبيهات السلامة"
            description="حالات تحتاج تدخّل سريع من فريق المركز."
            tone="danger"
          >
            {safetyAlerts.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={ShieldAlert}
                  title="لا توجد تنبيهات سلامة"
                  description="لا توجد تنبيهات مسجّلة على مرضاك حاليًا."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {safetyAlerts.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/cases/${a.caseId}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {a.summary ?? "تنبيه سلامة"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          {safetyAlertSeverityAr(a.severity)}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {safetyAlertStatusAr(a.status)}
                        </span>
                        <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <SectionCard
            icon={Star}
            title="التقييمات"
            description={
              avgRating
                ? `متوسط التقييم: ${avgRating}/5 من ${reviews.length} تقييم موثَّق.`
                : "تقييمات المرضى الموثَّقة."
            }
          >
            {reviews.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Star}
                  title="لا توجد تقييمات بعد"
                  description="ستظهر هنا تقييمات المرضى الموثَّقة."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {reviews.map((r) => (
                  <li key={r.id} className="px-5 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-warning-foreground">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              "size-4 " +
                              (i < Number(r.overallRating)
                                ? "fill-current"
                                : "text-muted")
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {r.overallRating}/5
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
