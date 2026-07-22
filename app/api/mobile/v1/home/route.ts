import { listDoctorAppointments, listPatientAppointments } from "@/lib/data/appointments"
import { searchDoctors } from "@/lib/data/doctors"
import { absolutize, jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const OPEN_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "RESCHEDULED",
])

/** One aggregated call powering the app's home screen — a patient's next
 *  booking + featured doctors, or a doctor's today's/upcoming patients. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const isDoctor = auth.user.role === "doctor"
  try {
    const [appointments, featured] = await Promise.all([
      isDoctor
        ? listDoctorAppointments(auth.user.id)
        : listPatientAppointments(auth.user.id),
      isDoctor ? Promise.resolve(null) : searchDoctors({ pageSize: 6 }),
    ])

    const now = new Date()
    const upcoming = appointments
      .filter(
        (a) =>
          new Date(a.startsAt).getTime() >= now.getTime() &&
          OPEN_STATUSES.has(a.status),
      )
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )

    const next = upcoming[0]
    const withPhoto = (a: (typeof upcoming)[number]) => ({
      ...a,
      counterpartPhotoUrl: absolutize(a.counterpartPhotoUrl),
    })

    if (isDoctor) {
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)
      const today = upcoming.filter((a) => new Date(a.startsAt).getTime() <= todayEnd.getTime())
      return jsonOk({
        firstName: auth.user.name.trim().split(/\s+/)[0] ?? auth.user.name,
        upcomingCount: upcoming.length,
        todayCount: today.length,
        nextAppointment: next ? withPhoto(next) : null,
        todaysAppointments: today.slice(0, 8).map(withPhoto),
        featuredDoctors: [],
      })
    }

    return jsonOk({
      firstName: auth.user.name.trim().split(/\s+/)[0] ?? auth.user.name,
      upcomingCount: upcoming.length,
      nextAppointment: next ? withPhoto(next) : null,
      featuredDoctors: (featured?.results ?? []).map((d) => ({
        ...d,
        photoUrl: absolutize(d.photoUrl),
      })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
