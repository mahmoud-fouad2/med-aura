import { listPatientAppointments } from "@/lib/data/appointments"
import { searchDoctors } from "@/lib/data/doctors"
import { absolutize, jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const OPEN_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "RESCHEDULED",
])

/** One aggregated call powering the app's home screen. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const [appointments, featured] = await Promise.all([
      listPatientAppointments(auth.user.id),
      searchDoctors({ pageSize: 6 }),
    ])

    const now = Date.now()
    const upcoming = appointments
      .filter(
        (a) =>
          new Date(a.startsAt).getTime() >= now && OPEN_STATUSES.has(a.status),
      )
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )

    const next = upcoming[0]
    return jsonOk({
      firstName: auth.user.name.trim().split(/\s+/)[0] ?? auth.user.name,
      upcomingCount: upcoming.length,
      nextAppointment: next
        ? { ...next, counterpartPhotoUrl: absolutize(next.counterpartPhotoUrl) }
        : null,
      featuredDoctors: featured.results.map((d) => ({
        ...d,
        photoUrl: absolutize(d.photoUrl),
      })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
