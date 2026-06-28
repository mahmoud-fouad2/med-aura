import { CheckCircle2, Info } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { listPatientAppointments } from "@/lib/data/appointments"
import { AppointmentList } from "@/components/appointments/appointment-list"

export const dynamic = "force-dynamic"

export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string; canceled?: string }>
}) {
  const user = (await getCurrentUser())!
  const { booked, canceled } = await searchParams
  const rows = await listPatientAppointments(user.id)

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">مواعيدي</h1>

      {booked && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 text-success" />
          <p className="text-foreground">
            تمت عملية الدفع. سيظهر الموعد كـ«مؤكد» بمجرد تأكيد بوابة الدفع
            (خلال لحظات).
          </p>
        </div>
      )}
      {canceled && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4" />
          تم إلغاء عملية الدفع ولم يتم تأكيد الموعد.
        </div>
      )}

      <AppointmentList rows={rows} perspective="patient" />
    </div>
  )
}
