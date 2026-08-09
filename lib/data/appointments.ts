import { and, eq, desc, gte, lte, ilike, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  payment,
  user as userT,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

const latestPaymentByAppointment = db
  .selectDistinctOn([payment.appointmentId], {
    appointmentId: payment.appointmentId,
    id: payment.id,
    status: payment.status,
    provider: payment.provider,
  })
  .from(payment)
  .orderBy(payment.appointmentId, desc(payment.createdAt))
  .as("latest_payment_by_appointment")

export type AppointmentRow = {
  id: string
  reference: string
  type: string
  status: string
  startsAt: Date
  endsAt: Date
  priceAmount: string | null
  currency: string
  counterpartName: string
  counterpartPhotoUrl?: string | null
  doctorSlug: string | null
  paymentStatus: string | null
  /** The payment to download a receipt for — only meaningful once it's PAID. */
  paymentId: string | null
  caseId: string | null
}

export async function listPatientAppointments(
  userId: string,
): Promise<AppointmentRow[]> {
  const rows = await db
    .select({
      id: appointment.id,
      reference: appointment.reference,
      type: appointment.type,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      priceAmount: appointment.priceAmount,
      currency: appointment.currency,
      counterpartName: doctorProfile.name,
      counterpartPhotoKey: doctorProfile.photoKey,
      doctorSlug: doctorProfile.slug,
      paymentStatus: latestPaymentByAppointment.status,
      paymentId: latestPaymentByAppointment.id,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .leftJoin(latestPaymentByAppointment, eq(latestPaymentByAppointment.appointmentId, appointment.id))
    .where(eq(appointment.patientUserId, userId))
    .orderBy(desc(appointment.startsAt))

  return rows.map(({ counterpartPhotoKey, ...r }) => ({
    ...r,
    counterpartPhotoUrl: counterpartPhotoKey ? getPublicUrl(counterpartPhotoKey) : null,
  }))
}

/** Resolve a doctor's profile id from their user id (or null if not a doctor). */
export async function getDoctorProfileId(
  userId: string,
): Promise<string | null> {
  const row = (
    await db
      .select({ id: doctorProfile.id })
      .from(doctorProfile)
      .where(eq(doctorProfile.userId, userId))
      .limit(1)
  )[0]
  return row?.id ?? null
}

export type ConsultationAdminRow = AppointmentRow & {
  patientName: string
  /** "stripe" | "manual" | "test" — drives whether "cancel manual payment"
   *  can even be offered for this row. */
  paymentProvider: string | null
}

export type ConsultationListFilters = {
  /** Matches reference, patient name, or doctor name. */
  q?: string
  status?: string
  paymentStatus?: string
  doctorId?: string
  from?: string
  to?: string
}

const CONSULTATION_PAGE_SIZE = 20

/**
 * Admin/concierge oversight — every appointment, latest first, joined to the
 * doctor's profile and the patient. Filtered + paginated at the SQL layer
 * (previously a flat `limit(200)` with only a status filter — that stopped
 * being workable once there's enough real traffic for a "page 2").
 */
export async function listAppointmentsForAdmin(
  filters?: ConsultationListFilters,
  page = 1,
  pageSize = CONSULTATION_PAGE_SIZE,
): Promise<{ rows: ConsultationAdminRow[]; totalCount: number; totalPages: number }> {
  const conditions: SQL[] = []

  if (filters?.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    conditions.push(
      or(
        ilike(appointment.reference, term),
        ilike(userT.name, term),
        ilike(doctorProfile.name, term),
      )!,
    )
  }
  if (filters?.status) {
    conditions.push(eq(appointment.status, filters.status as never))
  }
  if (filters?.doctorId) conditions.push(eq(appointment.doctorId, filters.doctorId))
  if (filters?.from) conditions.push(gte(appointment.startsAt, new Date(filters.from)))
  if (filters?.to) conditions.push(lte(appointment.startsAt, new Date(filters.to)))

  // paymentStatus lives on a left-joined table, so it has to be resolved as
  // an appointment-id set first — folding it into the join's ON clause
  // would silently turn the LEFT JOIN into an INNER JOIN for that row.
  if (filters?.paymentStatus) {
    const matches = await db
      .selectDistinct({ appointmentId: payment.appointmentId })
      .from(payment)
      .where(eq(payment.status, filters.paymentStatus as never))
    const ids = matches.map((m) => m.appointmentId).filter((id): id is string => id != null)
    conditions.push(sql`${appointment.id} = ANY(${ids.length > 0 ? ids : ["__none__"]})`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  // A bare LEFT JOIN on payment.appointmentId fans out into one row per
  // payment for any appointment with more than one payment record (a failed
  // attempt followed by a successful retry, for instance — not rare) —
  // duplicating that appointment in the list with a different payment
  // status on each copy, and inflating totalCount/pagination to match.
  // DISTINCT ON picks exactly the latest payment per appointment first.
  const baseQuery = db
    .select({
      id: appointment.id,
      reference: appointment.reference,
      type: appointment.type,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      priceAmount: appointment.priceAmount,
      currency: appointment.currency,
      counterpartName: doctorProfile.name,
      doctorSlug: doctorProfile.slug,
      patientName: userT.name,
      paymentStatus: latestPaymentByAppointment.status,
      paymentId: latestPaymentByAppointment.id,
      paymentProvider: latestPaymentByAppointment.provider,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .innerJoin(userT, eq(appointment.patientUserId, userT.id))
    .leftJoin(latestPaymentByAppointment, eq(latestPaymentByAppointment.appointmentId, appointment.id))

  // Doesn't select or filter on any payment field itself (the paymentStatus
  // filter above already resolves to a plain appointment.id condition), so
  // it never needed the payment join at all — that join was only ever
  // along for the fan-out bug, never for anything the count used.
  const countQuery = db
    .select({ n: sql<number>`count(*)::int` })
    .from(appointment)
    .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .innerJoin(userT, eq(appointment.patientUserId, userT.id))

  const [rows, countResult] = await Promise.all([
    baseQuery.where(where).orderBy(desc(appointment.startsAt)).limit(pageSize).offset((page - 1) * pageSize),
    countQuery.where(where),
  ])

  const totalCount = countResult[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return { rows, totalCount, totalPages }
}

export async function listDoctorAppointments(
  doctorUserId: string,
): Promise<AppointmentRow[]> {
  const profileId = await getDoctorProfileId(doctorUserId)
  if (!profileId) return []
  const rows = await db
    .select({
      id: appointment.id,
      reference: appointment.reference,
      type: appointment.type,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      priceAmount: appointment.priceAmount,
      currency: appointment.currency,
      counterpartName: userT.name,
      counterpartPhotoKey: userT.image,
      doctorSlug: sql<string | null>`null`,
      paymentStatus: latestPaymentByAppointment.status,
      paymentId: latestPaymentByAppointment.id,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(userT, eq(appointment.patientUserId, userT.id))
    .leftJoin(latestPaymentByAppointment, eq(latestPaymentByAppointment.appointmentId, appointment.id))
    .where(eq(appointment.doctorId, profileId))
    .orderBy(desc(appointment.startsAt))

  return rows.map(({ counterpartPhotoKey, ...r }) => ({
    ...r,
    counterpartPhotoUrl: counterpartPhotoKey ? getPublicUrl(counterpartPhotoKey) : null,
  }))
}
