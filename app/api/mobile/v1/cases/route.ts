import { listDoctorAssignedCases, listCasesForPatient } from "@/lib/data/cases"
import { jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * Lists cases for the current mobile user.
 * - If doctor: returns doctor-assigned cases with patient names and consent status.
 * - If patient: returns patient's own aesthetic cases with doctor names and procedure details.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  try {
    if (auth.user.role === "doctor") {
      const cases = await listDoctorAssignedCases(auth.user.id)
      // counterpartName is who this case is *with*, from the viewer's side —
      // the patient's name, for a doctor viewer.
      return jsonOk({
        cases: cases.map((c) => ({ ...c, counterpartName: c.patientName })),
        role: "doctor",
      })
    }

    const patientCases = await listCasesForPatient(auth.user.id)
    const cases = patientCases.map((c) => ({
      id: c.id,
      reference: c.reference,
      status: c.status,
      procedureName: c.procedureName,
      // counterpartName here is the doctor's name — the patient's own case
      // list is "who is this case with", never the viewer's own name.
      counterpartName: c.doctorName ? `د. ${c.doctorName}` : "ميد أورا",
      doctorName: c.doctorName,
      doctorPhotoUrl: c.doctorPhotoUrl,
      createdAt: c.createdAt.toISOString(),
      consentActive: true,
    }))
    return jsonOk({ cases, role: "patient" })
  } catch (err) {
    return jsonServerError("mobile.cases", err)
  }
}
