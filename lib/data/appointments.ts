import { and, eq, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  payment,
  user as userT,
} from "@/lib/db/schema"

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
  paymentStatus: string | null
  caseId: string | null
}

export async function listPatientAppointments(
  userId: string,
): Promise<AppointmentRow[]> {
  return db
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
      paymentStatus: payment.status,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .leftJoin(payment, eq(payment.appointmentId, appointment.id))
    .where(eq(appointment.patientUserId, userId))
    .orderBy(desc(appointment.startsAt))
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

export async function listDoctorAppointments(
  doctorUserId: string,
): Promise<AppointmentRow[]> {
  const profileId = await getDoctorProfileId(doctorUserId)
  if (!profileId) return []
  return db
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
      paymentStatus: payment.status,
      caseId: appointment.caseId,
    })
    .from(appointment)
    .innerJoin(userT, eq(appointment.patientUserId, userT.id))
    .leftJoin(payment, eq(payment.appointmentId, appointment.id))
    .where(eq(appointment.doctorId, profileId))
    .orderBy(desc(appointment.startsAt))
}
