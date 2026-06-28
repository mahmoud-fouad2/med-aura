import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { listDoctorAppointments } from "@/lib/data/appointments"
import { listDoctorAssignedCases } from "@/lib/data/cases"
import { AppointmentList } from "@/components/appointments/appointment-list"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { caseStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export default async function DoctorDashboardPage() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  if (!roles.includes(ROLES.DOCTOR)) redirect("/dashboard")

  const [appointments, cases] = await Promise.all([
    listDoctorAppointments(user.id),
    listDoctorAssignedCases(user.id),
  ])

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">لوحة الطبيب</h1>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-foreground">المواعيد</h2>
        <AppointmentList rows={appointments} perspective="doctor" />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold text-foreground">
          الحالات المشتركة معك
        </h2>
        {cases.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            لا توجد حالات بعد.
          </Card>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-foreground">
                      {c.procedureName}
                    </span>
                    <Badge variant="secondary">{caseStatusAr(c.status)}</Badge>
                    {c.consentActive ? (
                      <Badge variant="default">تم منح الإذن</Badge>
                    ) : (
                      <Badge variant="outline">بانتظار إذن المريض</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.patientName} · {c.reference}
                  </p>
                </div>
                {c.consentActive ? (
                  <Link
                    href={`/dashboard/cases/${c.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    فتح الحالة
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    لا يمكن الاطّلاع قبل منح الإذن
                  </span>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
