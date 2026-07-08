import Link from "next/link"
import {
  Search,
  FileText,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  CalendarClock,
  Heart,
  Bell,
  ChevronLeft,
  BadgeCheck,
  CircleAlert,
  Clock,
  CreditCard,
  LifeBuoy,
} from "lucide-react"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { db } from "@/lib/db"
import { providerApplication } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { listCasesForPatient } from "@/lib/data/cases"
import { listPatientAppointments } from "@/lib/data/appointments"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { getFavoriteRefIds } from "@/lib/data/favorites"
import { DashboardHero } from "@/components/dashboard/hero-banner"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { PersonAvatar } from "@/components/ui/person-avatar"
import { FadeIn, Reveal, Stagger, StaggerItem } from "@/components/motion"
import {
  caseStatusAr,
  appointmentStatusAr,
  appointmentTypeAr,
} from "@/lib/status-labels"
import { firstNameOf } from "@/lib/format"

export const dynamic = "force-dynamic"

const ACTIVE_CASE = new Set([
  "SUBMITTED",
  "MATCHING",
  "SHARED_WITH_PROVIDER",
  "UNDER_REVIEW",
  "MORE_INFORMATION_REQUIRED",
  "CONSULTATION_REQUIRED",
  "CONSULTATION_BOOKED",
  "CONSULTATION_COMPLETED",
  "TREATMENT_PLAN_ISSUED",
  "QUOTE_ISSUED",
  "PATIENT_REVIEWING",
  "QUOTE_ACCEPTED",
  "DEPOSIT_PAID",
  "MEDICALLY_APPROVED",
  "CENTER_CONFIRMED",
  "FULLY_PAID",
  "PROCEDURE_CONFIRMED",
  "PROCEDURE_COMPLETED",
  "FOLLOW_UP",
])

const UPCOMING_APPT = new Set([
  "PENDING_PAYMENT",
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "RESCHEDULED",
])

function relativeDay(d: Date): string {
  const days = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days === 0) return "اليوم"
  if (days === 1) return "غدًا"
  if (days === -1) return "أمس"
  if (days > 1 && days < 8) return `خلال ${days} أيام`
  return d.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short" })
}

export default async function DashboardHome() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  const isDoctor = roles.includes(ROLES.DOCTOR)
  const isAdmin =
    roles.includes(ROLES.SUPER_ADMIN) ||
    roles.includes(ROLES.COMPLIANCE_REVIEWER)

  const [cases, appointments, unread, favs, lastApp] = await Promise.all([
    listCasesForPatient(user.id),
    listPatientAppointments(user.id),
    getUnreadNotificationCount(user.id),
    getFavoriteRefIds(user.id),
    db
      .select({ status: providerApplication.status })
      .from(providerApplication)
      .where(eq(providerApplication.applicantUserId, user.id))
      .orderBy(desc(providerApplication.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
  ])

  const activeCases = cases.filter((c) => ACTIVE_CASE.has(c.status))
  const upcoming = appointments
    .filter((a) => UPCOMING_APPT.has(a.status) && new Date(a.startsAt) > new Date(Date.now() - 60 * 60 * 1000))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  const nextAppt = upcoming[0]
  const currentCase = activeCases[0]
  const favTotal = favs.doctor.size + favs.center.size + favs.procedure.size

  const firstName = firstNameOf(user.name)

  // Real, actionable to-dos only — each one maps to a case/appointment state
  // that is genuinely waiting on the patient.
  const CASE_ACTION: Record<string, { title: string; desc: string }> = {
    MORE_INFORMATION_REQUIRED: {
      title: "طبيبك يحتاج معلومات إضافية",
      desc: "أضف التفاصيل أو الصور المطلوبة حتى تستمر المراجعة.",
    },
    CONSULTATION_REQUIRED: {
      title: "احجز موعد استشارتك",
      desc: "طبيبك جاهز للقائك — اختر الوقت المناسب لك.",
    },
    TREATMENT_PLAN_ISSUED: {
      title: "خطة علاجك جاهزة",
      desc: "اطّلع على تفاصيل الخطة المقترحة لك.",
    },
    QUOTE_ISSUED: {
      title: "عرض السعر بانتظار قرارك",
      desc: "راجع التكلفة والتفاصيل ثم اتخذ قرارك بهدوء.",
    },
    PATIENT_REVIEWING: {
      title: "عرض السعر بانتظار قرارك",
      desc: "راجع التكلفة والتفاصيل ثم اتخذ قرارك بهدوء.",
    },
    QUOTE_ACCEPTED: {
      title: "ادفع العربون لتثبيت إجراءك",
      desc: "خطوة واحدة تفصلك عن تأكيد موعد الإجراء.",
    },
    CENTER_CONFIRMED: {
      title: "أكمل سداد المبلغ المتبقي",
      desc: "المركز أكّد جاهزيته — أكمل الدفع لإتمام التثبيت.",
    },
    FOLLOW_UP: {
      title: "شارك تحديث تعافيك",
      desc: "أرسل صورة أو ملاحظة ليطمئن عليك طبيبك.",
    },
  }
  const requiredActions: { href: string; title: string; desc: string }[] = []
  for (const c of activeCases) {
    const a = CASE_ACTION[c.status]
    if (a) {
      requiredActions.push({
        href: `/dashboard/cases/${c.id}`,
        title: a.title,
        desc: `${c.procedureName} · ${a.desc}`,
      })
    }
  }
  for (const a of upcoming) {
    if (a.status === "PENDING_PAYMENT") {
      requiredActions.push({
        href: "/dashboard/appointments",
        title: "أكمل الدفع لتثبيت موعدك",
        desc: `${appointmentTypeAr(a.type)} مع ${a.counterpartName} — لن يُحجز الوقت قبل إتمام الدفع.`,
      })
    }
  }

  return (
    <div className="space-y-6">
      <FadeIn>
      <DashboardHero
        eyebrow="لوحة الرحلة التجميلية"
        greeting={`أهلًا ${firstName} 👋`}
        subtitle="من هنا تدير حالاتك، تتابع مواعيدك، وترى تقدّمك خطوة بخطوة. كل شيء تحت سيطرتك وبأمان تام."
        actions={
          <>
            <Button
              size="lg"
              render={
                <Link href="/search">
                  <Search className="size-4" />
                  ابحث عن طبيب تجميل
                </Link>
              }
            />
            <Button
              variant="outline"
              size="lg"
              render={
                <Link href="/dashboard/cases/new">
                  <Sparkles className="size-4" />
                  ابدأ حالة جديدة
                </Link>
              }
            />
          </>
        }
        aside={
          currentCase ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <BadgeCheck className="size-3.5" />
                حالتك الحالية
              </div>
              <div className="flex items-start gap-2.5">
                {currentCase.doctorName && (
                  <PersonAvatar
                    src={currentCase.doctorPhotoUrl}
                    name={currentCase.doctorName}
                    className="mt-0.5"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold leading-snug text-foreground">
                    {currentCase.procedureName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentCase.doctorName ?? "بانتظار تعيين الطبيب"} · {currentCase.reference}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {caseStatusAr(currentCase.status)}
              </div>
              <Link
                href={`/dashboard/cases/${currentCase.id}`}
                className="group flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
              >
                افتح الحالة
                <ChevronLeft className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="size-3.5" />
                ابدأ رحلتك
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                لم تُنشئ أي حالة بعد. ابدأ باختيار الإجراء الذي يهمّك ومشاركة صورك بأمان تام.
              </p>
              <Button
                size="sm"
                className="w-full"
                render={<Link href="/dashboard/cases/new">إنشاء أول حالة</Link>}
              />
            </div>
          )
        }
      />
      </FadeIn>

      {requiredActions.length > 0 && (
        <Reveal>
        <section
          aria-label="إجراءات مطلوبة منك"
          className="overflow-hidden rounded-2xl border border-warning/40 bg-gradient-to-l from-warning/10 via-card to-card"
        >
          <div className="flex items-center gap-2 border-b border-warning/20 px-5 py-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
              <CircleAlert className="size-4" />
            </span>
            <h2 className="font-heading text-sm font-bold text-foreground">
              مطلوب منك الآن
            </h2>
            <span className="ms-auto rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-warning-foreground">
              {requiredActions.length.toLocaleString("ar-SA-u-nu-latn")}
            </span>
          </div>
          <ul className="divide-y divide-warning/15">
            {requiredActions.slice(0, 4).map((a) => (
              <li key={a.href + a.title}>
                <Link
                  href={a.href}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-warning/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ChevronLeft className="size-4 shrink-0 text-warning-foreground/70 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </Reveal>
      )}

      <Reveal delay={0.1}>
      <section aria-label="موعدك القادم">
        {nextAppt ? (
          <div className="overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-l from-success/8 via-card to-card">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-success/10 text-success ring-1 ring-success/20">
                  <span className="font-heading text-xl font-extrabold leading-none tabular-nums">
                    {new Date(nextAppt.startsAt).toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric" })}
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">
                    {new Date(nextAppt.startsAt).toLocaleDateString("ar-SA-u-nu-latn", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-success">
                    موعدك القادم · {relativeDay(new Date(nextAppt.startsAt))}
                  </p>
                  <h2 className="mt-1 flex items-center gap-2 truncate font-heading text-lg font-bold text-foreground">
                    <PersonAvatar
                      src={nextAppt.counterpartPhotoUrl}
                      name={nextAppt.counterpartName}
                      size="sm"
                    />
                    <span className="truncate">
                      {appointmentTypeAr(nextAppt.type)} مع {nextAppt.counterpartName}
                    </span>
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {new Date(nextAppt.startsAt).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(nextAppt.endsAt).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                      {appointmentStatusAr(nextAppt.status)}
                    </span>
                    {nextAppt.status === "PENDING_PAYMENT" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning-foreground">
                        <CreditCard className="size-3" />
                        بانتظار إتمام الدفع
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ms-auto">
                <Button
                  size="sm"
                  render={<Link href="/dashboard/appointments">تفاصيل مواعيدي</Link>}
                />
                {nextAppt.caseId && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/dashboard/cases/${nextAppt.caseId}`}>
                        افتح الحالة المرتبطة
                      </Link>
                    }
                  />
                )}
              </div>
            </div>
            <p className="border-t border-success/15 bg-success/5 px-5 py-2.5 text-xs text-muted-foreground">
              تحتاج تغيير موعدك أو لديك سؤال؟{" "}
              <Link href="/contact" className="font-medium text-primary hover:underline">
                فريقنا يساعدك في أي وقت
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <CalendarClock className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-bold text-foreground">
                لا مواعيد قادمة حاليًا
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                عندما تحجز استشارتك ستجد موعدها هنا مع كل التفاصيل والتذكيرات.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              render={
                <Link href="/search">
                  <Search className="size-4" />
                  اختر طبيبك واحجز
                </Link>
              }
            />
          </div>
        )}
      </section>
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
        <MetricCard
          icon={FileText}
          label="حالات نشطة"
          value={activeCases.length.toLocaleString("ar-SA-u-nu-latn")}
          hint={cases.length > activeCases.length ? `+ ${cases.length - activeCases.length} حالة مغلقة` : "لا توجد حالات مغلقة بعد"}
          href="/dashboard/cases"
          tone="primary"
          emphasis
        />
        </StaggerItem>
        <StaggerItem>
        <MetricCard
          icon={Bell}
          label="إشعارات غير مقروءة"
          value={unread.toLocaleString("ar-SA-u-nu-latn")}
          hint={unread === 0 ? "أنت على اطلاع بكل شيء" : "افتح صندوق الوارد"}
          href="/dashboard/notifications"
          tone={unread > 0 ? "warning" : "neutral"}
        />
        </StaggerItem>
        <StaggerItem>
        <MetricCard
          icon={Heart}
          label="المفضلة"
          value={favTotal.toLocaleString("ar-SA-u-nu-latn")}
          hint={favTotal === 0 ? "احفظ أطباءك المفضلين" : "افتح قائمتك"}
          href="/dashboard/favorites"
          tone="neutral"
        />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.15}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            icon={CalendarClock}
            title="مواعيدك القادمة"
            description="استشارات، إجراءات، ومتابعات قادمة."
            viewAllHref="/dashboard/appointments"
            tone="success"
          >
            {upcoming.length === 0 ? (
              <div className="flex items-center gap-4 p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <CalendarClock className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    لا توجد مواعيد مجدولة
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    عندما تحجز استشارة أو إجراء ستظهر هنا مع تذكير قبل الموعد.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {upcoming.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <Link
                      href="/dashboard/appointments"
                      className="group flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/8 text-primary">
                          <span className="font-heading text-[13px] font-bold leading-none">
                            {new Date(a.startsAt).toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric" })}
                          </span>
                          <span className="mt-0.5 text-[9px] uppercase tracking-wider">
                            {new Date(a.startsAt).toLocaleDateString("ar-SA-u-nu-latn", { month: "short" })}
                          </span>
                        </div>
                        <PersonAvatar src={a.counterpartPhotoUrl} name={a.counterpartName} size="sm" className="shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {appointmentTypeAr(a.type)} — {a.counterpartName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(a.startsAt).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            {appointmentStatusAr(a.status)}
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            icon={FileText}
            title="آخر حالاتك"
            description="جميع الحالات النشطة والمغلقة."
            viewAllHref="/dashboard/cases"
          >
            {cases.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="mt-4 font-heading font-bold text-foreground">
                  لم تبدأ أي حالة بعد
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  استكشف الإجراءات، اختر طبيبًا يناسبك، وابدأ حالتك بأمان تام.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  render={<Link href="/dashboard/cases/new">ابدأ حالة جديدة</Link>}
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {cases.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="group flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {c.doctorName && (
                          <PersonAvatar src={c.doctorPhotoUrl} name={c.doctorName} size="sm" className="shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {c.procedureName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {c.doctorName ?? "بانتظار تعيين طبيب"} · {c.reference}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                            (ACTIVE_CASE.has(c.status)
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground")
                          }
                        >
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
        </div>

        <div className="space-y-4">
          <SectionCard
            icon={Sparkles}
            title="اختصارات"
            description="ابدأ خطوتك التالية بسرعة."
            padded
          >
            <div className="grid gap-2">
              <QuickLink
                href="/search"
                icon={Search}
                title="ابحث عن طبيب تجميل"
                desc="أطباء ومراكز معتمدة قريبة منك."
              />
              <QuickLink
                href="/procedures"
                icon={Sparkles}
                title="اكتشف الإجراءات"
                desc="تفاصيل، أسعار، ومدد التعافي."
              />
              <QuickLink
                href="/before-after"
                icon={FileText}
                title="حالات قبل وبعد"
                desc="نتائج موثّقة بموافقة المرضى."
              />
              {!isDoctor && (
                <QuickLink
                  href="/dashboard/provider/apply"
                  icon={Stethoscope}
                  title={lastApp ? "متابعة طلب الانضمام" : "انضم كمقدّم خدمة"}
                  desc={
                    lastApp
                      ? `الحالة: ${applicationStatusAr(lastApp.status)}`
                      : "أنت طبيب أو صاحب مركز؟"
                  }
                />
              )}
              {isDoctor && (
                <QuickLink
                  href="/dashboard/doctor"
                  icon={Stethoscope}
                  title="لوحة الطبيب"
                  desc="مواعيدك وحالاتك."
                />
              )}
              {isAdmin && (
                <QuickLink
                  href="/admin"
                  icon={ShieldCheck}
                  title="لوحة الإدارة"
                  desc="إشراف على المنصة."
                />
              )}
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
                <LifeBuoy className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-foreground">
                  تحتاج مساعدة؟
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  فريقنا يرافقك في كل خطوة — من اختيار الطبيب حتى ما بعد الإجراء.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    تواصل معنا
                    <ChevronLeft className="size-3 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                  <Link
                    href="/faq"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    الأسئلة الشائعة
                    <ChevronLeft className="size-3 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/6 via-card to-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-foreground">
                  خصوصيتك محمية
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  صورك وتقاريرك مشفّرة، ولا يراها طبيب إلا بموافقتك المباشرة.
                </p>
                <Link
                  href="/trust-and-safety"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  اقرأ سياسة الأمان
                  <ChevronLeft className="size-3 rtl:rotate-0 ltr:rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      </Reveal>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronLeft className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
    </Link>
  )
}

function applicationStatusAr(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "مسودة",
    SUBMITTED: "تم الإرسال",
    UNDER_REVIEW: "قيد المراجعة",
    NEEDS_CHANGES: "بحاجة لتعديل",
    APPROVED: "تمت الموافقة",
    REJECTED: "مرفوض",
  }
  return map[status] ?? status
}
