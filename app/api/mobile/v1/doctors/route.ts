import type { NextRequest } from "next/server"
import { searchDoctors, type SearchParams } from "@/lib/data/doctors"
import { absolutize, jsonError, jsonOk } from "@/lib/mobile-api"
import { isValidLatitude, isValidLongitude, MAX_RADIUS_KM } from "@/lib/distance"

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
    // A present-but-out-of-range coordinate is a genuine client bug — fail
    // loudly with a clear message instead of silently misbehaving. A single
    // missing coordinate (the other one absent entirely) just falls back to
    // the normal search, since that's a safe no-op rather than an error.
    const rawLat = num(sp.get("lat"))
    const rawLng = num(sp.get("lng"))
    if (rawLat != null && !isValidLatitude(rawLat)) {
      return jsonError("خط العرض المُرسل غير صالح.", 422)
    }
    if (rawLng != null && !isValidLongitude(rawLng)) {
      return jsonError("خط الطول المُرسل غير صالح.", 422)
    }
    const hasValidCoords = rawLat != null && rawLng != null
    const rawRadius = num(sp.get("radiusKm"))
    const radiusKm =
      hasValidCoords && rawRadius != null && rawRadius > 0
        ? Math.min(rawRadius, MAX_RADIUS_KM)
        : undefined
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
      radiusKm,
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
