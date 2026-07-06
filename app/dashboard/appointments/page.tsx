import Link from "next/link"
import { CheckCircle2, Info, CalendarClock, Search } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { listPatientAppointments } from "@/lib/data/appointments"
import { AppointmentList } from "@/components/appointments/appointment-list"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

const UPCOMING = new Set([
  "PENDING_PAYMENT",
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "RESCHEDULED",
])

export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string; canceled?: string }>
}) {
  const user = (await getCurrentUser())!
  const { booked, canceled } = await searchParams
  const rows = await listPatientAppointments(user.id)

  const now = new Date()
  const upcoming = rows.filter(
    (a) => UPCOMING.has(a.status) && new Date(a.startsAt) >= now,
  )
  const past = rows.filter(
    (a) => !UPCOMING.has(a.status) || new Date(a.startsAt) < now,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="جدولي"
        title="مواعيدي"
        description="استشارات، إجراءات، ومتابعات قادمة وسابقة."
        actions={
          <Button
            variant="outline"
            render={
              <Link href="/search">
                <Search className="size-4" />
                احجز موعدًا
              </Link>
            }
          />
        }
      />

      {booked && (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/8 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="font-medium text-foreground">تمت عملية الدفع</p>
            <p className="mt-0.5 text-muted-foreground">
              سيظهر الموعد كـ«مؤكد» بمجرد تأكيد بوابة الدفع خلال لحظات.
            </p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">تم إلغاء عملية الدفع</p>
            <p className="mt-0.5">
              لم يتم تأكيد الموعد. يمكنك المحاولة مرة أخرى في أي وقت.
            </p>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-foreground">
              المواعيد القادمة
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {upcoming.length.toLocaleString("ar-SA-u-nu-latn")}
            </span>
          </div>
          <AppointmentList rows={upcoming} perspective="patient" />
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-foreground">
              مواعيد سابقة
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {past.length.toLocaleString("ar-SA-u-nu-latn")}
            </span>
          </div>
          <AppointmentList rows={past} perspective="patient" />
        </section>
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-12">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="size-7" />
            </span>
            <h3 className="font-heading text-xl font-bold text-foreground">
              لا توجد مواعيد بعد
            </h3>
            <p className="text-sm text-muted-foreground">
              احجز استشارتك الأولى مع طبيب تجميل معتمد لتظهر مواعيدك هنا.
            </p>
            <Button
              render={
                <Link href="/search">
                  <Search className="size-4" />
                  ابحث عن طبيب
                </Link>
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
