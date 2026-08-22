import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { center, doctorProfile, review, user } from "@/lib/db/schema"

export async function listPendingReviews() {
  return db
    .select({
      id: review.id,
      overallRating: review.overallRating,
      comment: review.comment,
      anonymousDisplay: review.anonymousDisplay,
      patientName: user.name,
      doctorName: doctorProfile.name,
      centerName: center.name,
      createdAt: review.createdAt,
    })
    .from(review)
    .innerJoin(user, eq(review.patientUserId, user.id))
    .leftJoin(doctorProfile, eq(review.doctorId, doctorProfile.id))
    .leftJoin(center, eq(review.centerId, center.id))
    .where(eq(review.moderationStatus, "PENDING"))
    .orderBy(desc(review.createdAt))
    .limit(200)
}

export type PendingReview = Awaited<ReturnType<typeof listPendingReviews>>[number]
