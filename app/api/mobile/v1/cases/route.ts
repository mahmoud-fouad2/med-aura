import { listDoctorAssignedCases } from "@/lib/data/cases"
import { jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * A doctor's own shared-cases list — natively replaces what used to be a
 * "Open dashboard" web hand-off from Home. Same data function the web
 * dashboard's doctor page uses (lib/data/cases.ts), which already scopes to
 * the doctor's own profile and returns an empty list for a non-doctor
 * caller rather than erroring — the route still checks the role explicitly
 * so a patient calling this by mistake gets a clear 403, not a silent
 * empty screen.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  try {
    const cases = await listDoctorAssignedCases(auth.user.id)
    return jsonOk({ cases })
  } catch (err) {
    return jsonServerError("mobile.cases", err)
  }
}
