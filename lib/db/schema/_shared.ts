import { pgEnum, timestamp, text } from "drizzle-orm/pg-core"

/**
 * Reusable lifecycle columns. Returned from a function so each table gets fresh
 * column builders (sharing a single object across pgTable() calls is unsafe).
 */
export function lifecycle() {
  return {
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deletedAt", { withTimezone: true }),
  }
}

/** Who created / last touched a row (nullable; references user.id by app code). */
export function authorship() {
  return {
    createdBy: text("createdBy"),
    updatedBy: text("updatedBy"),
  }
}

/* ── State-machine enums (section 35: use pgEnum for core statuses) ───────── */

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "disabled",
  "suspended",
])

export const providerStatusEnum = pgEnum("provider_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
])

export const applicationStatusEnum = pgEnum("application_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_CHANGES",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "EXPIRED",
])

export const applicationKindEnum = pgEnum("application_kind", [
  "DOCTOR",
  "CENTER",
])

export const licenseStatusEnum = pgEnum("license_status", [
  "PENDING",
  "VALID",
  "EXPIRED",
  "REVOKED",
])

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "VIDEO_CONSULTATION",
  "IN_PERSON_CONSULTATION",
  "PHONE_CONSULTATION",
  "PROCEDURE",
  "FOLLOW_UP",
])

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "PENDING_PAYMENT",
  "PENDING_PROVIDER_CONFIRMATION",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "RESCHEDULED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PROVIDER",
  "NO_SHOW",
])

export const caseStatusEnum = pgEnum("case_status", [
  "DRAFT",
  "SUBMITTED",
  "MATCHING",
  "SHARED_WITH_PROVIDER",
  "UNDER_REVIEW",
  "MORE_INFORMATION_REQUIRED",
  "CONSULTATION_REQUIRED",
  "CONSULTATION_BOOKED",
  "CONSULTATION_COMPLETED",
  "TREATMENT_PLAN_ISSUED",
  "QUOTE_ISSUED",
  "PATIENT_REVIEWING",
  "QUOTE_ACCEPTED",
  "DEPOSIT_PAID",
  "MEDICALLY_APPROVED",
  "CENTER_CONFIRMED",
  "FULLY_PAID",
  "PROCEDURE_CONFIRMED",
  "PROCEDURE_COMPLETED",
  "FOLLOW_UP",
  "CLOSED",
  "CANCELLED",
])

export const consentStatusEnum = pgEnum("consent_status", [
  "GRANTED",
  "REVOKED",
  "EXPIRED",
])

export const documentKindEnum = pgEnum("document_kind", [
  "CASE_PHOTO",
  "MEDICAL_REPORT",
  "LAB_RESULT",
  "ID_DOCUMENT",
  "LICENSE",
  "CERTIFICATE",
  "OTHER",
])

export const paymentStatusEnum = pgEnum("payment_status", [
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
])

export const paymentPurposeEnum = pgEnum("payment_purpose", [
  "CONSULTATION_FEE",
  "DEPOSIT",
  "PARTIAL_PAYMENT",
  "FINAL_PAYMENT",
  "SERVICE_FEE",
])
