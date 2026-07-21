import type { NextRequest } from "next/server"
import { searchDoctors, type SearchParams } from "@/lib/data/doctors"
import { absolutize, jsonError, jsonOk } from "@/lib/mobile-api"
import { isValidLatitude, isValidLongitude } from "@/lib/distance"

export const dynamic = "force-dynamic"

/** Public doctor search — same visibility rules as the web search. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const num = (v: string | null) =>
      v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined
    const consultation = sp.get("consultation")
    const sort = sp.get("sort")
    const surgical = sp.get("surgical")
    // Coordinates are only honoured when both are present and in-range —
    // a malformed or partial pair is silently dropped, never guessed at.
    const rawLat = num(sp.get("lat"))
    const rawLng = num(sp.get("lng"))
    const hasValidCoords =
      rawLat != null && rawLng != null && isValidLatitude(rawLat) && isValidLongitude(rawLng)
    const params: SearchParams = {
      q: sp.get("q") ?? undefined,
      category: sp.get("category") ?? undefined,
      procedure: sp.get("procedure") ?? undefined,
      country: sp.get("country") ?? undefined,
      city: sp.get("city") ?? undefined,
      language: sp.get("language") ?? undefined,
      consultation:
        consultation === "VIDEO_CONSULTATION" || consultation === "IN_PERSON_CONSULTATION"
          ? consultation
          : undefined,
      surgical: surgical === "true" || surgical === "false" ? surgical : undefined,
      priceMin: num(sp.get("priceMin")),
      priceMax: num(sp.get("priceMax")),
      sort:
        sort === "price_low" || sort === "price_high" || sort === "rating" || sort === "nearest"
          ? sort
          : undefined,
      lat: hasValidCoords ? rawLat : undefined,
      lng: hasValidCoords ? rawLng : undefined,
      radiusKm: hasValidCoords ? num(sp.get("radiusKm")) : undefined,
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
