import { listDoctorAppointments, listPatientAppointments } from "@/lib/data/appointments"
import { absolutize, jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"
import { canMarkAppointmentNoShow } from "@/lib/domain/appointment-state"

export const dynamic = "force-dynamic"

/**
 * The signed-in user's own appointments — a patient's bookings, or a
 * doctor's patient list, by session role. Same shape either way: the
 * "counterpart" is whoever is on the other side of the appointment.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const rows =
      auth.user.role === "doctor"
        ? await listDoctorAppointments(auth.user.id)
        : await listPatientAppointments(auth.user.id)
    return jsonOk({
      appointments: rows.map((a) => ({
        ...a,
        counterpartPhotoUrl: absolutize(a.counterpartPhotoUrl),
        canMarkNoShow:
          auth.user.role === "doctor" &&
          canMarkAppointmentNoShow({ status: a.status, endsAt: a.endsAt }),
      })),
    })
  } catch (err) {
    return jsonServerError("mobile.appointments", err)
  }
}
