import { and, desc, eq, isNotNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { aestheticCase, patientProfile, procedure, review, user } from "@/lib/db/schema"

export type FeaturedReview = {
  id: string
  rating: number
  comment: string
  authorName: string
  authorImage: string | null
  anonymous: boolean
  procedureNameAr: string | null
  procedureNameEn: string | null
  city: string | null
}

export type FeaturedReviewSummary = {
  reviews: FeaturedReview[]
  averageRating: number
  reviewCount: number
}

const publicReviewFilter = and(
  eq(review.verified, true),
  eq(review.moderationStatus, "PUBLISHED"),
  isNotNull(review.comment),
  sql`length(trim(${review.comment})) > 0`,
)

/**
 * Homepage social proof must come from completed, published experiences only.
 * Anonymous reviews never expose the account image or full account name.
 */
export async function getFeaturedReviewSummary(limit = 3): Promise<FeaturedReviewSummary> {
  const [rows, aggregate] = await Promise.all([
    db
      .select({
        id: review.id,
        rating: review.overallRating,
        comment: review.comment,
        authorName: user.name,
        authorImage: user.image,
        anonymous: review.anonymousDisplay,
        procedureNameAr: procedure.nameAr,
        procedureNameEn: procedure.nameEn,
        city: patientProfile.city,
      })
      .from(review)
      .innerJoin(user, eq(review.patientUserId, user.id))
      .leftJoin(aestheticCase, eq(review.caseId, aestheticCase.id))
      .leftJoin(procedure, eq(aestheticCase.procedureId, procedure.id))
      .leftJoin(patientProfile, eq(review.patientUserId, patientProfile.userId))
      .where(publicReviewFilter)
      .orderBy(desc(review.createdAt))
      .limit(Math.max(1, Math.min(limit, 6))),
    db
      .select({
        averageRating: sql<string>`avg(${review.overallRating})`,
        reviewCount: sql<number>`count(*)::int`,
      })
      .from(review)
      .where(publicReviewFilter),
  ])

  const totals = aggregate[0]

  return {
    reviews: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment?.replace(/\s+/g, " ").trim() ?? "",
      authorName: row.anonymous ? "" : row.authorName,
      authorImage: row.anonymous ? null : row.authorImage,
      anonymous: row.anonymous,
      procedureNameAr: row.procedureNameAr,
      procedureNameEn: row.procedureNameEn,
      city: row.city,
    })),
    averageRating: Number(totals?.averageRating ?? 0),
    reviewCount: Number(totals?.reviewCount ?? 0),
  }
}
