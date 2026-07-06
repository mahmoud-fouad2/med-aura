"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  travelRequest,
  travelOffer,
  aestheticCase,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, hasPermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string }

const RequestSchema = z.object({
  caseId: z.string().min(1),
  originCountry: z.string().min(2, "دولة الانطلاق مطلوبة"),
  originCity: z.string().optional().nullable(),
  destinationCountry: z.string().min(2, "دولة الوجهة مطلوبة"),
  destinationCity: z.string().optional().nullable(),
  arrivalDate: z.string().optional().nullable(),
  departureDate: z.string().optional().nullable(),
  travelers: z.coerce.number().int().min(1).max(20).default(1),
  needsAccommodation: z.coerce.boolean().default(false),
  needsAirportTransfer: z.coerce.boolean().default(false),
  needsInterpreter: z.coerce.boolean().default(false),
  interpreterLanguage: z.string().max(80).optional().nullable(),
  specialRequirements: z.string().max(2000).optional().nullable(),
})

/**
 * Patient creates a travel request for one of their own cases. The action
 * verifies case ownership; SUBMITTED is the initial state so the concierge
 * queue picks it up immediately. Only one open request per case at a time.
 */
export async function submitTravelRequest(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.TRAVEL_REQUEST_OWN)
    const parsed = RequestSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صالحة")
    }
    const data = parsed.data

    const [caseRow] = await db
      .select({ patientUserId: aestheticCase.patientUserId })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, data.caseId))
      .limit(1)
    if (!caseRow) throw new AppError("NOT_FOUND")
    if (caseRow.patientUserId !== user.id) {
      throw new AppError("FORBIDDEN", {
        userMessage: "لا تملك صلاحية إضافة طلب سفر لهذه الحالة.",
      })
    }

    // Refuse if there's already an OPEN travel request on this case
    const OPEN = [
      "DRAFT",
      "SUBMITTED",
      "INFO_REQUESTED",
      "ASSIGNED",
      "OFFER_SENT",
    ]
    const existing = await db
      .select({
        id: travelRequest.id,
        status: travelRequest.status,
      })
      .from(travelRequest)
      .where(eq(travelRequest.caseId, data.caseId))
    if (existing.some((r) => OPEN.includes(r.status))) {
      throw new AppError("CONFLICT", {
        userMessage: "يوجد طلب سفر مفتوح لهذه الحالة بالفعل.",
      })
    }

    const [row] = await db
      .insert(travelRequest)
      .values({
        caseId: data.caseId,
        patientUserId: user.id,
        originCountry: data.originCountry,
        originCity: data.originCity || null,
        destinationCountry: data.destinationCountry,
        destinationCity: data.destinationCity || null,
        arrivalDate: data.arrivalDate || null,
        departureDate: data.departureDate || null,
        travelers: data.travelers,
        needsAccommodation: data.needsAccommodation,
        needsAirportTransfer: data.needsAirportTransfer,
        needsInterpreter: data.needsInterpreter,
        interpreterLanguage: data.interpreterLanguage || null,
        specialRequirements: data.specialRequirements || null,
        status: "SUBMITTED",
        // 48h SLA target for the initial concierge response
        slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: travelRequest.id })

    const meta = await requestMeta()
    await writeAudit({
      action: "travel.request.submit",
      actorUserId: user.id,
      entityType: "travel_request",
      entityId: row.id,
      metadata: {
        caseId: data.caseId,
        destinationCountry: data.destinationCountry,
      },
      ...meta,
    })

    revalidatePath(`/dashboard/cases/${data.caseId}`)
    revalidatePath("/admin/travel")
    revalidatePath("/dashboard/concierge")
    revalidatePath("/admin/concierge")
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Concierge assigns the request to themselves. */
export async function assignTravelRequest(
  requestId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.TRAVEL_OFFER_MANAGE)

    const [row] = await db
      .select({ status: travelRequest.status })
      .from(travelRequest)
      .where(eq(travelRequest.id, requestId))
      .limit(1)
    if (!row) throw new AppError("NOT_FOUND")
    if (row.status === "CANCELLED" || row.status === "FULFILLED") {
      throw new AppError("CONFLICT", {
        userMessage: "هذا الطلب مغلق.",
      })
    }

    await db
      .update(travelRequest)
      .set({
        assignedConciergeId: user.id,
        status: "ASSIGNED",
        updatedBy: user.id,
      })
      .where(eq(travelRequest.id, requestId))

    const meta = await requestMeta()
    await writeAudit({
      action: "travel.request.assign",
      actorUserId: user.id,
      entityType: "travel_request",
      entityId: requestId,
      ...meta,
    })

    revalidatePath("/admin/travel")
    revalidatePath("/dashboard/concierge")
    revalidatePath("/admin/concierge")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const OfferSchema = z.object({
  requestId: z.string().min(1),
  flightNotes: z.string().max(2000).optional().nullable(),
  hotelName: z.string().max(200).optional().nullable(),
  hotelNotes: z.string().max(2000).optional().nullable(),
  transferNotes: z.string().max(2000).optional().nullable(),
  interpreterNotes: z.string().max(1000).optional().nullable(),
  totalAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(["SAR", "USD", "EUR", "TRY", "AED", "GBP"]).default("SAR"),
  validUntilDays: z.coerce.number().int().min(1).max(60).default(7),
})

/** Concierge issues an offer against an assigned request. */
export async function createTravelOffer(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.TRAVEL_OFFER_MANAGE)
    const parsed = OfferSchema.safeParse(input)
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صالحة")
    }
    const data = parsed.data

    const [req] = await db
      .select({
        id: travelRequest.id,
        status: travelRequest.status,
        assignedConciergeId: travelRequest.assignedConciergeId,
      })
      .from(travelRequest)
      .where(eq(travelRequest.id, data.requestId))
      .limit(1)
    if (!req) throw new AppError("NOT_FOUND")
    if (req.status === "CANCELLED" || req.status === "FULFILLED") {
      throw new AppError("CONFLICT", {
        userMessage: "هذا الطلب مغلق.",
      })
    }

    const validUntil = new Date(
      Date.now() + data.validUntilDays * 24 * 60 * 60 * 1000,
    )

    const [offer] = await db
      .insert(travelOffer)
      .values({
        requestId: data.requestId,
        createdBy: user.id,
        flightNotes: data.flightNotes || null,
        hotelName: data.hotelName || null,
        hotelNotes: data.hotelNotes || null,
        transferNotes: data.transferNotes || null,
        interpreterNotes: data.interpreterNotes || null,
        totalAmount:
          data.totalAmount != null ? String(data.totalAmount) : null,
        currency: data.currency,
        validUntil,
        status: "SENT",
        sentAt: new Date(),
        updatedBy: user.id,
      })
      .returning({ id: travelOffer.id })

    await db
      .update(travelRequest)
      .set({ status: "OFFER_SENT", updatedBy: user.id })
      .where(eq(travelRequest.id, data.requestId))

    const meta = await requestMeta()
    await writeAudit({
      action: "travel.offer.send",
      actorUserId: user.id,
      entityType: "travel_offer",
      entityId: offer.id,
      metadata: { requestId: data.requestId, currency: data.currency },
      ...meta,
    })

    revalidatePath("/admin/travel")
    revalidatePath("/dashboard/concierge")
    revalidatePath("/admin/concierge")
    return { ok: true, data: { id: offer.id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Patient accepts an offer. */
export async function acceptTravelOffer(
  offerId: string,
  note?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()

    const [offer] = await db
      .select({
        id: travelOffer.id,
        status: travelOffer.status,
        requestId: travelOffer.requestId,
      })
      .from(travelOffer)
      .where(eq(travelOffer.id, offerId))
      .limit(1)
    if (!offer) throw new AppError("NOT_FOUND")

    // Verify the acting user owns the parent request (patient ownership)
    const [req] = await db
      .select({
        patientUserId: travelRequest.patientUserId,
        status: travelRequest.status,
      })
      .from(travelRequest)
      .where(eq(travelRequest.id, offer.requestId))
      .limit(1)
    if (!req) throw new AppError("NOT_FOUND")
    if (req.patientUserId !== user.id) {
      throw new AppError("FORBIDDEN", {
        userMessage: "لا تملك صلاحية الرد على هذا العرض.",
      })
    }
    if (offer.status !== "SENT") {
      throw new AppError("CONFLICT", {
        userMessage: "لم يعد هذا العرض متاحًا للرد.",
      })
    }

    await db.transaction(async (tx) => {
      await tx
        .update(travelOffer)
        .set({
          status: "ACCEPTED",
          respondedAt: new Date(),
          responseNote: note || null,
          updatedBy: user.id,
        })
        .where(eq(travelOffer.id, offerId))
      // withdraw any other sent offers on the same request
      await tx
        .update(travelOffer)
        .set({
          status: "WITHDRAWN",
          respondedAt: new Date(),
          updatedBy: user.id,
        })
        .where(
          and(
            eq(travelOffer.requestId, offer.requestId),
            eq(travelOffer.status, "SENT"),
          ),
        )
      await tx
        .update(travelRequest)
        .set({ status: "ACCEPTED", updatedBy: user.id })
        .where(eq(travelRequest.id, offer.requestId))
      await writeAudit(
        {
          action: "travel.offer.accept",
          actorUserId: user.id,
          entityType: "travel_offer",
          entityId: offerId,
          metadata: { requestId: offer.requestId },
        },
        tx,
      )
    })

    revalidatePath("/admin/travel")
    revalidatePath("/dashboard/concierge")
    revalidatePath("/admin/concierge")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Cancel a request. Patient or a concierge/admin (with permission). */
export async function cancelTravelRequest(
  requestId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const [req] = await db
      .select({
        patientUserId: travelRequest.patientUserId,
        status: travelRequest.status,
      })
      .from(travelRequest)
      .where(eq(travelRequest.id, requestId))
      .limit(1)
    if (!req) throw new AppError("NOT_FOUND")
    if (req.status === "CANCELLED" || req.status === "FULFILLED") {
      return { ok: true }
    }

    const isOwner = req.patientUserId === user.id
    const canManage = await hasPermission(user.id, PERMISSIONS.TRAVEL_OFFER_MANAGE)
    if (!isOwner && !canManage) {
      throw new AppError("FORBIDDEN", {
        userMessage: "لا تملك صلاحية إلغاء هذا الطلب.",
      })
    }

    await db
      .update(travelRequest)
      .set({ status: "CANCELLED", updatedBy: user.id })
      .where(eq(travelRequest.id, requestId))

    const meta = await requestMeta()
    await writeAudit({
      action: "travel.request.cancel",
      actorUserId: user.id,
      entityType: "travel_request",
      entityId: requestId,
      metadata: { reason },
      ...meta,
    })

    revalidatePath("/admin/travel")
    revalidatePath("/dashboard/concierge")
    revalidatePath("/admin/concierge")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
