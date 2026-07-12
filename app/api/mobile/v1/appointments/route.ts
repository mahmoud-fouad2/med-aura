import { listPatientAppointments } from "@/lib/data/appointments"
import { absolutize, jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** The signed-in patient's own appointments (ownership by session). */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const rows = await listPatientAppointments(auth.user.id)
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
