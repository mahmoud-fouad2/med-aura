import type { NextRequest } from "next/server"
import { searchDoctors, type SearchParams } from "@/lib/data/doctors"
import { absolutize, jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Public doctor search — same visibility rules as the web search. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const params: SearchParams = {
      q: sp.get("q") ?? undefined,
      category: sp.get("category") ?? undefined,
      procedure: sp.get("procedure") ?? undefined,
      country: sp.get("country") ?? undefined,
      city: sp.get("city") ?? undefined,
      page: Math.max(1, Number(sp.get("page") ?? "1") || 1),
      pageSize: Math.min(20, Math.max(1, Number(sp.get("pageSize") ?? "12") || 12)),
    }
    const { results, total } = await searchDoctors(params)
    return jsonOk({
      total,
      page: params.page,
      doctors: results.map((d) => ({ ...d, photoUrl: absolutize(d.photoUrl) })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
