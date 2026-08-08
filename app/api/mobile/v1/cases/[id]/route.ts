import { getCaseDetailForUser } from "@/lib/data/cases"
import { jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * Read-only case summary for the native app — same data and same
 * authorization (`canAccessCase`, called inside `getCaseDetailForUser`) as
 * the web dashboard's case page. A doctor only sees this once granted
 * active consent for the case; an outsider gets the same 404 as a
 * non-existent case, never a 403 that would confirm the id is real.
 * Document bytes are NOT served here — the client fetches
 * `/api/documents/{id}` per document, which is already authorized and
 * audited per-document.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const detail = await getCaseDetailForUser(auth.user.id, id)
    if (!detail) return jsonError("الحالة غير موجودة.", 404)

    return jsonOk({
      id: detail.id,
      reference: detail.reference,
      status: detail.status,
      goal: detail.goal,
      description: detail.description,
      procedureName: detail.procedureName,
      patientName: detail.patientName,
      centerName: detail.centerName,
      doctorName: detail.doctorName,
      consentActive: detail.consentActive,
      isOwner: detail.isOwner,
      documents: detail.documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        kind: d.kind,
        contentType: d.contentType,
        createdAt: d.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    return jsonServerError("mobile.cases.id", err)
  }
}
