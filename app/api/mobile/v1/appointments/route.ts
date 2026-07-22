import { listDoctorAppointments, listPatientAppointments } from "@/lib/data/appointments"
import { absolutize, jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

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
      })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
