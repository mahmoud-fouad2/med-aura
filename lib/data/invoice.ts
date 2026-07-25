import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  payment,
  user as userT,
  appointment,
  doctorProfile,
  center,
  aestheticCase,
  procedure as procedureT,
} from "@/lib/db/schema"

/**
 * One payment IS one receipt/invoice — the schema's `invoice` table is an
 * aggregate for the case/final-payment flow (never populated with line
 * items anywhere in the codebase today), while every payment already
 * carries everything a receipt needs (amount, currency, status, method,
 * date) plus a stable unique `reference`. Using the payment as the
 * document's anchor covers consultation-fee AND case-linked payments alike
 * without depending on the not-yet-built invoice-line-item pipeline.
 */
export type PaymentReceiptData = {
  paymentId: string
  reference: string
  purpose: string
  status: string
  amount: string
  currency: string
  provider: string
  paidAt: Date | null
  createdAt: Date
  payerUserId: string
  payerName: string
  payerEmail: string
  appointmentReference: string | null
  appointmentType: string | null
  appointmentStartsAt: Date | null
  doctorName: string | null
  centerName: string | null
  serviceNameEn: string | null
}

export async function getPaymentReceiptData(
  paymentId: string,
): Promise<PaymentReceiptData | null> {
  const rows = await db
    .select({
      paymentId: payment.id,
      reference: payment.reference,
      purpose: payment.purpose,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      payerUserId: payment.payerUserId,
      payerName: userT.name,
      payerEmail: userT.email,
      appointmentReference: appointment.reference,
      appointmentType: appointment.type,
      appointmentStartsAt: appointment.startsAt,
      doctorName: doctorProfile.name,
      centerName: center.name,
      serviceNameEn: procedureT.nameEn,
    })
    .from(payment)
    .innerJoin(userT, eq(payment.payerUserId, userT.id))
    .leftJoin(appointment, eq(payment.appointmentId, appointment.id))
    .leftJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .leftJoin(center, eq(appointment.centerId, center.id))
    .leftJoin(aestheticCase, eq(appointment.caseId, aestheticCase.id))
    .leftJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .where(eq(payment.id, paymentId))
    .limit(1)

  return rows[0] ?? null
}
