"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aestheticCase, doctorProfile, center, review } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { writeAudit } from "@/lib/audit"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

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
        moderationStatus: "PUBLISHED",
      })
      if (c.doctorId) await recomputeDoctorRating(tx, c.doctorId)
      if (c.centerId) await recomputeCenterRating(tx, c.centerId)
      await writeAudit({ action: "review.create", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id, metadata: { overall: data.overallRating } }, tx)
    })

    revalidatePath(`/dashboard/cases/${c.id}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
