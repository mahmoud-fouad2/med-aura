import { desc, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/lib/db"
import {
  payment,
  user as userT,
  appointment,
  doctorProfile,
  center,
  aestheticCase,
  procedure as procedureT,
  refundRequest,
  creditNote,
} from "@/lib/db/schema"

const caseDoctorProfile = alias(doctorProfile, "case_doctor_profile")
const caseCenter = alias(center, "case_center")

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
  serviceNameAr?: string | null
  caseReference?: string | null
  refundedAmount?: string | null
  creditNoteNumber?: string | null
  refundedAt?: Date | null
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
      doctorName: sql<string | null>`coalesce(${doctorProfile.name}, ${caseDoctorProfile.name})`,
      centerName: sql<string | null>`coalesce(${center.name}, ${caseCenter.name})`,
      serviceNameEn: procedureT.nameEn,
      serviceNameAr: procedureT.nameAr,
      caseReference: aestheticCase.reference,
      refundedAmount: refundRequest.amount,
      creditNoteNumber: creditNote.creditNoteNumber,
      refundedAt: refundRequest.processedAt,
    })
    .from(payment)
    .innerJoin(userT, eq(payment.payerUserId, userT.id))
    .leftJoin(appointment, eq(payment.appointmentId, appointment.id))
    .leftJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .leftJoin(center, eq(appointment.centerId, center.id))
    .leftJoin(
      aestheticCase,
      sql`${aestheticCase.id} = coalesce(${payment.caseId}, ${appointment.caseId})`,
    )
    .leftJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .leftJoin(caseDoctorProfile, eq(aestheticCase.doctorId, caseDoctorProfile.id))
    .leftJoin(caseCenter, eq(aestheticCase.centerId, caseCenter.id))
    .leftJoin(
      refundRequest,
      sql`${refundRequest.paymentId} = ${payment.id} and ${refundRequest.status} = 'PROCESSED'`,
    )
    .leftJoin(creditNote, eq(refundRequest.creditNoteId, creditNote.id))
    .where(eq(payment.id, paymentId))
    .limit(1)

  return rows[0] ?? null
}

export type MyPaymentRow = {
  paymentId: string
  reference: string
  purpose: string
  status: string
  amount: string
  currency: string
  provider: string
  paidAt: Date | null
  createdAt: Date
  appointmentId: string | null
  appointmentReference: string | null
  appointmentType: string | null
  doctorName: string | null
  centerName: string | null
  serviceNameEn: string | null
  serviceNameAr: string | null
}

/**
 * A user's own payment history (patient billing — never exposed to a
 * doctor viewer; see decideInvoiceAccess). Unlike getPaymentReceiptData,
 * this joins the case/procedure/doctor/center via `payment.caseId` — set
 * directly on every case-linked payment, not just consultation-fee ones —
 * so deposits and final payments (which never have an appointmentId) still
 * show a real service and provider name instead of nulls.
 */
export async function listMyPayments(userId: string): Promise<MyPaymentRow[]> {
  return db
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
      appointmentId: payment.appointmentId,
      appointmentReference: appointment.reference,
      appointmentType: appointment.type,
      doctorName: sql<string | null>`coalesce(${doctorProfile.name}, ${caseDoctorProfile.name})`,
      centerName: sql<string | null>`coalesce(${center.name}, ${caseCenter.name})`,
      serviceNameEn: procedureT.nameEn,
      serviceNameAr: procedureT.nameAr,
    })
    .from(payment)
    .leftJoin(appointment, eq(payment.appointmentId, appointment.id))
    .leftJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
    .leftJoin(center, eq(appointment.centerId, center.id))
    .leftJoin(aestheticCase, eq(payment.caseId, aestheticCase.id))
    .leftJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .leftJoin(caseDoctorProfile, eq(aestheticCase.doctorId, caseDoctorProfile.id))
    .leftJoin(caseCenter, eq(aestheticCase.centerId, caseCenter.id))
    .where(eq(payment.payerUserId, userId))
    .orderBy(desc(payment.createdAt))
}
