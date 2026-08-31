import type { NextRequest } from "next/server"
import { getPublicDoctorBySlug } from "@/lib/data/doctors"
import { listPublicBeforeAfter } from "@/lib/data/before-after"
import { listPublicDoctorReviews } from "@/lib/data/reviews"
import { absolutize, jsonError, jsonOk, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Full public doctor profile (only publicly visible doctors resolve) —
 *  gallery and reviews included, same as the web doctor page shows. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const doctor = await getPublicDoctorBySlug(slug)
    if (!doctor) return jsonError("الطبيب غير موجود.", 404)

    const [gallery, reviews] = await Promise.all([
      listPublicBeforeAfter({ doctorSlug: slug, limit: 6 }),
      listPublicDoctorReviews(slug, 8),
    ])

    return jsonOk({
      ...doctor,
      photoUrl: absolutize(doctor.photoUrl),
      gallery: gallery.map((item) => ({
        id: item.id,
        titleAr: item.titleAr,
        procedureNameAr: item.procedureNameAr,
        beforeUrl: absolutize(item.beforeUrl),
        afterUrl: absolutize(item.afterUrl),
      })),
      reviews: reviews.map((rev) => ({
        id: rev.id,
        rating: rev.rating,
        comment: rev.comment,
        authorName: rev.anonymous ? null : rev.authorName,
        anonymous: rev.anonymous,
        providerResponse: rev.providerResponse,
        createdAt: rev.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    return jsonServerError("mobile.doctors.slug", err)
  }
}
