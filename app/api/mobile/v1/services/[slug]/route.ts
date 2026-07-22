import type { NextRequest } from "next/server"
import { getServiceDetail } from "@/lib/data/procedures"
import { absolutize, jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Full service view + the doctors who offer it (absolute photo URLs). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const service = await getServiceDetail(slug)
    if (!service) return jsonError("الخدمة غير موجودة.", 404)
    const { imagePath, ...rest } = service
    return jsonOk({
      ...rest,
      imageUrl: absolutize(imagePath)!,
      doctors: service.doctors.map((d) => ({
        ...d,
        photoUrl: absolutize(d.photoUrl),
      })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
