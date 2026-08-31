"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aestheticCase, doctorProfile, center, review, user as userT } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { PERMISSIONS, requirePermission } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"
import { trackAnalyticsEvent } from "@/lib/analytics"

const rating = z.coerce.number().int().min(1).max(5)
const reviewSchema = z.object({
  caseId: z.string().min(1),
  overallRating: rating,
  doctorRating: rating.optional(),
  centerRating: rating.optional(),
  communicationRating: rating.optional(),
  priceClarityRating: rating.optional(),
  followUpRating: rating.optional(),
  comment: z.string().max(2000).optional().default(""),
  anonymousDisplay: z.boolean().optional().default(false),
})

// A verified review is allowed only after a completed service.
const COMPLETED_STATES = ["PROCEDURE_COMPLETED", "FOLLOW_UP", "FULLY_PAID", "CLOSED"]

async function recomputeDoctorRating(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  doctorId: string,
) {
  const rows = await tx
    .select({ overall: review.overallRating })
    .from(review)
    .where(and(eq(review.doctorId, doctorId), eq(review.moderationStatus, "PUBLISHED")))
  const n = rows.length
  const avg = n ? rows.reduce((s, r) => s + (r.overall ?? 0), 0) / n : 0
  await tx
    .update(doctorProfile)
    .set({ rating: n ? avg.toFixed(1) : null, reviewCount: n })
    .where(eq(doctorProfile.id, doctorId))
}

async function recomputeCenterRating(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  centerId: string,
) {
  const rows = await tx
    .select({ overall: review.overallRating })
    .from(review)
    .where(and(eq(review.centerId, centerId), eq(review.moderationStatus, "PUBLISHED")))
  const n = rows.length
  const avg = n ? rows.reduce((s, r) => s + (r.overall ?? 0), 0) / n : 0
  await tx
    .update(center)
    .set({ rating: n ? avg.toFixed(1) : null, reviewCount: n })
    .where(eq(center.id, centerId))
}

export async function submitReview(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const data = reviewSchema.parse(input)

    const c = (
      await db
        .select({
          id: aestheticCase.id,
          status: aestheticCase.status,
          doctorId: aestheticCase.doctorId,
          centerId: aestheticCase.centerId,
          patientUserId: aestheticCase.patientUserId,
        })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, data.caseId))
        .limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (c.patientUserId !== user.id) throw forbidden()
    if (!COMPLETED_STATES.includes(c.status))
      throw conflict("يمكنك التقييم بعد اكتمال الخدمة فقط.")

    const existing = (
      await db
        .select({ id: review.id })
        .from(review)
        .where(and(eq(review.caseId, c.id), eq(review.patientUserId, user.id)))
        .limit(1)
    )[0]
    if (existing) throw conflict("سبق أن قيّمت هذه الحالة.")

    await db.transaction(async (tx) => {
      await tx.insert(review).values({
        caseId: c.id,
        patientUserId: user.id,
        doctorId: c.doctorId,
        centerId: c.centerId,
        overallRating: data.overallRating,
        doctorRating: data.doctorRating,
        centerRating: data.centerRating,
        communicationRating: data.communicationRating,
        priceClarityRating: data.priceClarityRating,
        followUpRating: data.followUpRating,
        comment: data.comment,
        anonymousDisplay: data.anonymousDisplay,
        verified: true, // system-determined: tied to a completed case
        moderationStatus: data.comment.trim() ? "PENDING" : "PUBLISHED",
      })
      // Star-only reviews contain no free text and can contribute immediately.
      // Written comments wait for moderation so PII/abuse is never published
      // directly from an untrusted patient submission.
      if (!data.comment.trim()) {
        if (c.doctorId) await recomputeDoctorRating(tx, c.doctorId)
        if (c.centerId) await recomputeCenterRating(tx, c.centerId)
      }
      await writeAudit({ action: "review.create", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id, metadata: { overall: data.overallRating } }, tx)
    })

    await trackAnalyticsEvent({
      name: "review_submitted",
      userId: user.id,
      locale: "ar",
      properties: { hasComment: Boolean(data.comment.trim()), rating: data.overallRating },
    })

    revalidatePath(`/dashboard/cases/${c.id}`)
    return { ok: true }
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, error: "سبق أن قيّمت هذه الحالة.", code: "CONFLICT" }
    }
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export type MyReviewRow = {
  id: string
  rating: number
  comment: string
  authorName: string
  anonymous: boolean
  providerResponse: string | null
  createdAt: Date
}

/** A doctor's own published reviews, for the practice page's reply UI —
 *  same publication scope patients already see (nothing unmoderated). */
export async function getMyReviewsAction(): Promise<
  { status: "ok"; reviews: MyReviewRow[] } | { status: "error"; message: string }
> {
  const user = await requireUser()
  const dp = (
    await db.select({ id: doctorProfile.id }).from(doctorProfile).where(eq(doctorProfile.userId, user.id)).limit(1)
  )[0]
  if (!dp) return { status: "error", message: "لم يتم العثور على ملف الطبيب." }

  const rows = await db
    .select({
      id: review.id,
      rating: review.overallRating,
      comment: review.comment,
      authorName: userT.name,
      anonymous: review.anonymousDisplay,
      providerResponse: review.providerResponse,
      createdAt: review.createdAt,
    })
    .from(review)
    .innerJoin(userT, eq(review.patientUserId, userT.id))
    .where(and(eq(review.doctorId, dp.id), eq(review.moderationStatus, "PUBLISHED")))
    .orderBy(review.createdAt)

  return {
    status: "ok",
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: (r.comment ?? "").replace(/\s+/g, " ").trim(),
      authorName: r.anonymous ? "" : r.authorName,
      anonymous: r.anonymous,
      providerResponse: r.providerResponse,
      createdAt: r.createdAt,
    })),
  }
}

const respondSchema = z.object({
  reviewId: z.string().min(1),
  response: z.string().trim().min(1, "اكتب ردًا أولاً").max(1000),
})

/** A doctor replying to their own review — ownership is the authorization,
 *  same model as updateMyPracticeAction. Only ever touches a PUBLISHED
 *  review the doctor's own doctorProfile is attached to. */
export async function respondToReviewAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const data = respondSchema.parse(input)

    const row = (
      await db
        .select({ id: review.id, doctorId: review.doctorId, moderationStatus: review.moderationStatus })
        .from(review)
        .where(eq(review.id, data.reviewId))
        .limit(1)
    )[0]
    if (!row || row.moderationStatus !== "PUBLISHED") throw new AppError("NOT_FOUND")

    const dp = (
      await db.select({ id: doctorProfile.id }).from(doctorProfile).where(eq(doctorProfile.userId, user.id)).limit(1)
    )[0]
    if (!dp || row.doctorId !== dp.id) throw forbidden()

    await db
      .update(review)
      .set({ providerResponse: data.response, providerRespondedAt: new Date(), updatedAt: new Date() })
      .where(eq(review.id, row.id))

    await writeAudit({
      action: "review.provider_response",
      actorUserId: user.id,
      entityType: "review",
      entityId: row.id,
    })

    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const moderationSchema = z.object({
  reviewId: z.string().min(1),
  decision: z.enum(["publish", "hide", "reject"]),
  reason: z.string().trim().max(1000).optional().default(""),
})

export async function moderateReview(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.BEFORE_AFTER_MODERATE)
    const data = moderationSchema.parse(input)
    const row = (
      await db.select().from(review).where(eq(review.id, data.reviewId)).limit(1)
    )[0]
    if (!row) throw new AppError("NOT_FOUND")

    const moderationStatus =
      data.decision === "publish"
        ? "PUBLISHED"
        : data.decision === "hide"
          ? "HIDDEN"
          : "REJECTED"
    if (row.moderationStatus === "REJECTED") {
      throw conflict("هذا التقييم مرفوض بالفعل ولا يمكن إعادة نشره.")
    }
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(review)
        .set({
          moderationStatus,
          hiddenReason: moderationStatus === "PUBLISHED" ? null : data.reason || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(review.id, row.id),
            eq(review.moderationStatus, row.moderationStatus),
          ),
        )
        .returning({ id: review.id })
      if (updated.length === 0) throw conflict("تغيّرت حالة التقييم. حدّث الصفحة.")
      if (row.doctorId) await recomputeDoctorRating(tx, row.doctorId)
      if (row.centerId) await recomputeCenterRating(tx, row.centerId)
      await writeAudit(
        {
          action: `review.${data.decision}`,
          actorUserId: user.id,
          entityType: "review",
          entityId: row.id,
          metadata: { reason: data.reason || undefined },
        },
        tx,
      )
    })

    revalidatePath("/")
    revalidatePath("/admin/reviews")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
