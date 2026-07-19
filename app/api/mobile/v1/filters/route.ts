import { getDoctorFilterFacets } from "@/lib/data/doctors"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Real filter options for the app's doctor filter sheet (never invented). */
export async function GET() {
  try {
    const facets = await getDoctorFilterFacets()
    return jsonOk(facets)
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
