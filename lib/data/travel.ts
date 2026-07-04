import { desc, eq, inArray, and } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  travelRequest,
  travelOffer,
  aestheticCase,
  user as userT,
} from "@/lib/db/schema"

export type TravelQueueRow = {
  id: string
  caseId: string
  status: string
  patientName: string
  patientCountry: string | null
  destinationCountry: string
  destinationCity: string | null
  arrivalDate: string | null
  departureDate: string | null
  travelers: number
  needsAccommodation: boolean
  needsAirportTransfer: boolean
  needsInterpreter: boolean
  interpreterLanguage: string | null
  assignedConciergeId: string | null
  assignedConciergeName: string | null
  createdAt: Date
  slaDueAt: Date | null
  offerCount: number
  lastOfferStatus: string | null
}

/**
 * Admin/concierge queue of travel requests. Optional status filter narrows
 * the list. Uses the batch-then-aggregate pattern for offer counts so the
 * query stays O(N) rows.
 */
export async function listTravelQueue(
  status?: string,
): Promise<TravelQueueRow[]> {
  if (!isDbConfigured) return []

  const cond = status
    ? and(eq(travelRequest.status, status as never))
    : undefined

  const rows = await db
    .select({
      id: travelRequest.id,
      caseId: travelRequest.caseId,
      status: travelRequest.status,
      patientName: userT.name,
      patientCountry: travelRequest.originCountry,
      destinationCountry: travelRequest.destinationCountry,
      destinationCity: travelRequest.destinationCity,
      arrivalDate: travelRequest.arrivalDate,
      departureDate: travelRequest.departureDate,
      travelers: travelRequest.travelers,
      needsAccommodation: travelRequest.needsAccommodation,
      needsAirportTransfer: travelRequest.needsAirportTransfer,
      needsInterpreter: travelRequest.needsInterpreter,
      interpreterLanguage: travelRequest.interpreterLanguage,
      assignedConciergeId: travelRequest.assignedConciergeId,
      createdAt: travelRequest.createdAt,
      slaDueAt: travelRequest.slaDueAt,
    })
    .from(travelRequest)
    .innerJoin(userT, eq(travelRequest.patientUserId, userT.id))
    .where(cond)
    .orderBy(desc(travelRequest.createdAt))
    .limit(200)

  if (rows.length === 0) return []

  const conciergeIds = Array.from(
    new Set(rows.map((r) => r.assignedConciergeId).filter(Boolean)),
  ) as string[]
  const conciergeMap = new Map<string, string>()
  if (conciergeIds.length > 0) {
    const cs = await db
      .select({ id: userT.id, name: userT.name })
      .from(userT)
      .where(inArray(userT.id, conciergeIds))
    for (const c of cs) conciergeMap.set(c.id, c.name)
  }

  const ids = rows.map((r) => r.id)
  const offers = await db
    .select({
      requestId: travelOffer.requestId,
      status: travelOffer.status,
      sentAt: travelOffer.sentAt,
    })
    .from(travelOffer)
    .where(inArray(travelOffer.requestId, ids))
    .orderBy(desc(travelOffer.sentAt))
  const offerCount = new Map<string, number>()
  const lastOffer = new Map<string, string>()
  for (const o of offers) {
    offerCount.set(o.requestId, (offerCount.get(o.requestId) ?? 0) + 1)
    if (!lastOffer.has(o.requestId)) lastOffer.set(o.requestId, o.status)
  }

  return rows.map((r) => ({
    ...r,
    assignedConciergeName: r.assignedConciergeId
      ? (conciergeMap.get(r.assignedConciergeId) ?? null)
      : null,
    offerCount: offerCount.get(r.id) ?? 0,
    lastOfferStatus: lastOffer.get(r.id) ?? null,
  }))
}

export type TravelRequestDetail = {
  request: TravelQueueRow & {
    specialRequirements: string | null
  }
  offers: {
    id: string
    createdBy: string
    createdByName: string | null
    createdAt: Date
    sentAt: Date | null
    respondedAt: Date | null
    validUntil: Date | null
    status: string
    totalAmount: string | null
    currency: string
    flightNotes: string | null
    hotelName: string | null
    hotelNotes: string | null
    transferNotes: string | null
    interpreterNotes: string | null
    responseNote: string | null
  }[]
}

export async function getTravelRequestDetail(
  requestId: string,
): Promise<TravelRequestDetail | null> {
  if (!isDbConfigured) return null
  const [row] = await db
    .select({
      id: travelRequest.id,
      caseId: travelRequest.caseId,
      status: travelRequest.status,
      patientName: userT.name,
      patientCountry: travelRequest.originCountry,
      destinationCountry: travelRequest.destinationCountry,
      destinationCity: travelRequest.destinationCity,
      arrivalDate: travelRequest.arrivalDate,
      departureDate: travelRequest.departureDate,
      travelers: travelRequest.travelers,
      needsAccommodation: travelRequest.needsAccommodation,
      needsAirportTransfer: travelRequest.needsAirportTransfer,
      needsInterpreter: travelRequest.needsInterpreter,
      interpreterLanguage: travelRequest.interpreterLanguage,
      assignedConciergeId: travelRequest.assignedConciergeId,
      createdAt: travelRequest.createdAt,
      slaDueAt: travelRequest.slaDueAt,
      specialRequirements: travelRequest.specialRequirements,
    })
    .from(travelRequest)
    .innerJoin(userT, eq(travelRequest.patientUserId, userT.id))
    .where(eq(travelRequest.id, requestId))
    .limit(1)
  if (!row) return null

  const [offersRaw, caseRow, conciergeRow] = await Promise.all([
    db
      .select()
      .from(travelOffer)
      .where(eq(travelOffer.requestId, requestId))
      .orderBy(desc(travelOffer.createdAt)),
    db
      .select({ id: aestheticCase.id })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, row.caseId))
      .limit(1),
    row.assignedConciergeId
      ? db
          .select({ name: userT.name })
          .from(userT)
          .where(eq(userT.id, row.assignedConciergeId))
          .limit(1)
      : Promise.resolve([]),
  ])
  void caseRow
  const creators = Array.from(new Set(offersRaw.map((o) => o.createdBy)))
  const nameMap = new Map<string, string>()
  if (creators.length > 0) {
    const rs = await db
      .select({ id: userT.id, name: userT.name })
      .from(userT)
      .where(inArray(userT.id, creators))
    for (const r of rs) nameMap.set(r.id, r.name)
  }

  return {
    request: {
      ...row,
      assignedConciergeName: conciergeRow[0]?.name ?? null,
      offerCount: offersRaw.length,
      lastOfferStatus: offersRaw[0]?.status ?? null,
    },
    offers: offersRaw.map((o) => ({
      id: o.id,
      createdBy: o.createdBy,
      createdByName: nameMap.get(o.createdBy) ?? null,
      createdAt: o.createdAt,
      sentAt: o.sentAt,
      respondedAt: o.respondedAt,
      validUntil: o.validUntil,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      flightNotes: o.flightNotes,
      hotelName: o.hotelName,
      hotelNotes: o.hotelNotes,
      transferNotes: o.transferNotes,
      interpreterNotes: o.interpreterNotes,
      responseNote: o.responseNote,
    })),
  }
}
