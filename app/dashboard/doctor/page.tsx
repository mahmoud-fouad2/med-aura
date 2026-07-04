import Link from "next/link"
import { redirect } from "next/navigation"
import {
  FolderOpen,
  CalendarClock,
  Stethoscope,
  Activity,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { listDoctorAppointments } from "@/lib/data/appointments"
import { listDoctorAssignedCases } from "@/lib/data/cases"
import { AppointmentList } from "@/components/appointments/appointment-list"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { DashboardHero } from "@/components/dashboard/hero-banner"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import { caseStatusAr, appointmentTypeAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

const UPCOMING_APPT = new Set([
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "RESCHEDULED",
])

const ACTIVE_CASE = new Set([
  "SUBMITTED",
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

function relativeDay(d: Date): string {
  const days = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days === 0) return "اليوم"
  if (days === 1) return "غدًا"
  if (days === -1) return "أمس"
  if (days > 1 && days < 8) return `خلال ${days} أيام`
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" })
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default async function DoctorDashboardPage() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  if (!roles.includes(ROLES.DOCTOR)) redirect("/dashboard")

  const [appointments, cases] = await Promise.all([
    listDoctorAppointments(user.id),
    listDoctorAssignedCases(user.id),
  ])

  const now = new Date()
  const todayStart = startOfDay(now)
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const upcoming = appointments
    .filter(
      (a) =>
        UPCOMING_APPT.has(a.status) &&
        new Date(a.startsAt) >= todayStart,
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )

  const today = upcoming.filter((a) => new Date(a.startsAt) < tomorrowStart)
  const nextAppt = upcoming[0]
  const activeCases = cases.filter((c) => ACTIVE_CASE.has(c.status))
  const pendingConsent = cases.filter((c) => !c.consentActive)

  const firstName = user.name.replace(/^د\.?\s*/, "").trim().split(" ")[0]

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="لوحة الطبيب"
        greeting={`أهلًا د. ${firstName}`}
        subtitle="ملخّص يومك: مواعيدك، حالاتك، والأذونات بانتظار التفعيل. كل شيء منظّم في مكان واحد."
        aside={
          nextAppt ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <CalendarClock className="size-3.5" />
                الموعد القادم
              </div>
              <div>
                <p className="font-heading text-lg font-bold leading-snug text-foreground">
                  {appointmentTypeAr(nextAppt.type)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  مع {nextAppt.counterpartName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    التاريخ
                  </p>
                  <p className="mt-0.5 font-heading text-sm font-bold text-foreground">
                    {relativeDay(new Date(nextAppt.startsAt))}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    الوقت
                  </p>
                  <p
                    dir="ltr"
                    className="mt-0.5 font-heading text-sm font-bold text-foreground"
                  >
                    {new Date(nextAppt.startsAt).toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <CalendarClock className="size-3.5" />
                جدولك مفتوح
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                لا توجد مواعيد قادمة حاليًا. تأكّد أن أوقات التوفر لديك محدَّثة
                ليتمكّن المرضى من الحجز.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                render={<Link href="/dashboard/doctor">إدارة التوفر</Link>}
              />
            </div>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={CalendarClock}
          label="مواعيد اليوم"
          value={today.length.toLocaleString("ar-SA")}
          hint={today.length === 0 ? "لا مواعيد اليوم" : "قادمة في جدولك"}
          tone={today.length > 0 ? "success" : "neutral"}
          emphasis
        />
        <MetricCard
          icon={Activity}
          label="مواعيد قادمة"
          value={upcoming.length.toLocaleString("ar-SA")}
          hint="خلال الأيام القادمة"
          tone="primary"
          emphasis
        />
        <MetricCard
          icon={FolderOpen}
          label="حالات نشطة"
          value={activeCases.length.toLocaleString("ar-SA")}
          hint="مشتركة معك بأذون سارية"
          tone="primary"
          emphasis
        />
        <MetricCard
          icon={ShieldCheck}
          label="بانتظار إذن المريض"
          value={pendingConsent.length.toLocaleString("ar-SA")}
          hint={
            pendingConsent.length === 0
              ? "كل الحالات مفتوحة لك"
              : "لا يمكن الاطلاع قبل الإذن"
          }
          tone={pendingConsent.length > 0 ? "warning" : "success"}
          emphasis
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            icon={CalendarClock}
            title="المواعيد"
            description="استشارات، إجراءات، ومتابعات في جدولك."
            tone="success"
          >
            <div className="p-5">
              <AppointmentList rows={appointments} perspective="doctor" />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            icon={Stethoscope}
            title="الحالات المشتركة"
            description="ملفات المرضى المشتركة معك."
            viewAllHref="/dashboard/cases"
          >
            {cases.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={FolderOpen}
                  title="لا توجد حالات بعد"
                  description="ستظهر هنا الحالات التي يشاركها معك المرضى."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {cases.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    {c.consentActive ? (
                      <Link
                        href={`/dashboard/cases/${c.id}`}
                        className="group flex items-start justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {c.procedureName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {c.patientName} · {c.reference}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {caseStatusAr(c.status)}
                          </span>
                          <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                        </div>
                      </Link>
                    ) : (
                      <div className="px-5 py-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {c.procedureName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {c.patientName} · {c.reference}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                            بانتظار الإذن
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          لا يمكن الاطّلاع قبل منح المريض الإذن.
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
