import type { NextRequest } from "next/server"
import { listServices } from "@/lib/data/procedures"
import { absolutize, jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Public services (procedures) list — searchable by name/category. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const services = await listServices({
      q: sp.get("q") ?? undefined,
      category: sp.get("category") ?? undefined,
    })
    return jsonOk({
      services: services.map(({ imagePath, ...s }) => ({
        ...s,
        imageUrl: absolutize(imagePath)!,
      })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
