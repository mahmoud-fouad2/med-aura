import type { NextRequest } from "next/server"
import { getPublicDoctorBySlug } from "@/lib/data/doctors"
import { absolutize, jsonError, jsonOk, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Full public doctor profile (only publicly visible doctors resolve). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const doctor = await getPublicDoctorBySlug(slug)
    if (!doctor) return jsonError("الطبيب غير موجود.", 404)
    return jsonOk({ ...doctor, photoUrl: absolutize(doctor.photoUrl) })
  } catch (err) {
    return jsonServerError("mobile.doctors.slug", err)
  }
}
