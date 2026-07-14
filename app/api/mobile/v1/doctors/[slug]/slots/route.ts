import type { NextRequest } from "next/server"
import { getPublicDoctorBySlug } from "@/lib/data/doctors"
import { getAvailableSlots } from "@/lib/data/availability"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Bookable slots for a doctor — same generator the web booking page uses. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const doctor = await getPublicDoctorBySlug(slug)
    if (!doctor) return jsonError("الطبيب غير موجود.", 404)

    const typeParam = request.nextUrl.searchParams.get("type")
    const type =
      typeParam === "IN_PERSON_CONSULTATION"
        ? "IN_PERSON_CONSULTATION"
        : "VIDEO_CONSULTATION"

    const slots = await getAvailableSlots(doctor.id, { type, limit: 300 })
    return jsonOk({
      doctorId: doctor.id,
      consultationFee: doctor.consultationFee,
      currency: doctor.currency,
      slots: slots.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
