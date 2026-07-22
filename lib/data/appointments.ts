import { and, eq, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  payment,
  user as userT,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

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
  paymentStatus: string | null
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
      paymentStatus: payment.status,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .leftJoin(payment, eq(payment.appointmentId, appointment.id))
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

/**
 * Admin/concierge oversight — every appointment, latest first, joined to the
 * doctor's profile and the patient. Optional status filter narrows to a single
 * pipeline state. Not paginated at the SQL layer yet because the appointment
 * volume in production stays well under one page; callers should refuse to
 * render more than 200 rows and switch to a filter instead.
 */
export async function listAppointmentsForAdmin(opts?: {
  status?: string
  limit?: number
}): Promise<(AppointmentRow & { patientName: string })[]> {
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
      patientName: userT.name,
      paymentStatus: payment.status,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .innerJoin(userT, eq(appointment.patientUserId, userT.id))
    .leftJoin(payment, eq(payment.appointmentId, appointment.id))
    .where(opts?.status ? eq(appointment.status, opts.status as never) : undefined)
    .orderBy(desc(appointment.startsAt))
    .limit(opts?.limit ?? 200)
  return rows
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
      paymentStatus: payment.status,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(userT, eq(appointment.patientUserId, userT.id))
    .leftJoin(payment, eq(payment.appointmentId, appointment.id))
    .where(eq(appointment.doctorId, profileId))
    .orderBy(desc(appointment.startsAt))

  return rows.map(({ counterpartPhotoKey, ...r }) => ({
    ...r,
    counterpartPhotoUrl: counterpartPhotoKey ? getPublicUrl(counterpartPhotoKey) : null,
  }))
}
