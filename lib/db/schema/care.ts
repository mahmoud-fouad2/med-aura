import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { lifecycle, authorship } from "./_shared"
import { user } from "./auth"
import { aestheticCase, medicalDocument } from "./cases"
import { doctorProfile, center } from "./providers"
import { procedure } from "./catalog"
import { appointment } from "./scheduling"
import { payment } from "./finance"

/* ── Enums ───────────────────────────────────────────────────────────────── */
export const suitabilityStatusEnum = pgEnum("suitability_status", [
  "PENDING",
  "SUITABLE_PRELIMINARILY",
  "MORE_INFORMATION_REQUIRED",
  "IN_PERSON_ASSESSMENT_REQUIRED",
  "NOT_SUITABLE",
  "REFERRED_ELSEWHERE",
])
export const treatmentPlanStatusEnum = pgEnum("treatment_plan_status", [
  "DRAFT",
  "PUBLISHED",
  "REVISED",
  "EXPIRED",
  "CANCELLED",
])
export const quoteStatusEnum = pgEnum("quote_status", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "SUPERSEDED",
])
export const quoteItemCategoryEnum = pgEnum("quote_item_category", [
  "DOCTOR_FEE",
  "CENTER_FEE",
  "OPERATING_ROOM",
  "ANESTHESIA",
  "LAB_TESTS",
  "MEDICATIONS",
  "MEDICAL_GARMENT",
  "HOSPITAL_STAY",
  "FOLLOW_UP",
  "TRANSPORT",
  "HOTEL",
  "TRANSLATION",
  "OTHER",
])
export const medicalApprovalStatusEnum = pgEnum("medical_approval_status", [
  "PENDING",
  "ADDITIONAL_TESTS_REQUIRED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
])
export const procedureBookingStatusEnum = pgEnum("procedure_booking_status", [
  "PENDING_MEDICAL_APPROVAL",
  "PENDING_CENTER_CONFIRMATION",
  "PENDING_PATIENT_REQUIREMENTS",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
])
export const checklistItemStatusEnum = pgEnum("checklist_item_status", [
  "PENDING",
  "COMPLETED",
  "WAIVED",
  "OVERDUE",
])
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
])
export const followUpTaskTypeEnum = pgEnum("follow_up_task_type", [
  "PHOTO_UPLOAD",
  "QUESTIONNAIRE",
  "VIDEO_APPOINTMENT",
  "IN_PERSON_APPOINTMENT",
  "MEDICATION_REMINDER",
  "GENERAL_CHECK",
  "DOCTOR_REVIEW",
])
export const followUpTaskStatusEnum = pgEnum("follow_up_task_status", [
  "SCHEDULED",
  "DUE",
  "SUBMITTED",
  "UNDER_REVIEW",
  "COMPLETED",
  "MISSED",
  "ESCALATED",
  "CANCELLED",
])
export const safetyAlertSeverityEnum = pgEnum("safety_alert_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
])
export const safetyAlertStatusEnum = pgEnum("safety_alert_status", [
  "OPEN",
  "ACKNOWLEDGED",
  "CONTACTED",
  "PROVIDER_REVIEWED",
  "RESOLVED",
  "REFERRED_TO_EMERGENCY",
  "FALSE_ALARM",
])
export const refundStatusEnum = pgEnum("refund_status", [
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "PROVIDER_CONFIRMED",
  "PROCESSED",
  "FAILED",
  "CANCELLED",
])
export const internalTaskStatusEnum = pgEnum("internal_task_status", [
  "OPEN",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
])
export const reviewModerationStatusEnum = pgEnum("review_moderation_status", [
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
  "REJECTED",
  "REPORTED",
])
export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "EMAIL",
  "SMS",
  "WHATSAPP",
])
export const notificationDeliveryStatusEnum = pgEnum("notification_delivery_status", [
  "PENDING",
  "SENT",
  "FAILED",
  "NOT_CONFIGURED",
  "OPTED_OUT",
])

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID())

/* ── Consultation outcome ────────────────────────────────────────────────── */
export const consultationOutcome = pgTable(
  "consultation_outcome",
  {
    id: id(),
    appointmentId: text("appointmentId")
      .notNull()
      .references(() => appointment.id, { onDelete: "cascade" }),
    caseId: text("caseId")
      .notNull()
      .references(() => aestheticCase.id, { onDelete: "cascade" }),
    doctorId: text("doctorId")
      .notNull()
      .references(() => doctorProfile.id, { onDelete: "restrict" }),
    patientUserId: text("patientUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    suitabilityStatus: suitabilityStatusEnum("suitabilityStatus")
      .notNull()
      .default("PENDING"),
    clinicalSummary: text("clinicalSummary"),
    patientVisibleNotes: text("patientVisibleNotes"),
    internalNotes: text("internalNotes"),
    additionalInformationRequired: text("additionalInformationRequired"),
    additionalDocumentsRequested: jsonb("additionalDocumentsRequested").notNull().default([]),
    labTestsRequested: jsonb("labTestsRequested").notNull().default([]),
    inPersonAssessmentRequired: boolean("inPersonAssessmentRequired").notNull().default(false),
    notSuitableReason: text("notSuitableReason"),
    completedAt: timestamp("completedAt", { withTimezone: true }),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    uniqueIndex("outcome_appointment_idx").on(t.appointmentId),
    index("outcome_case_idx").on(t.caseId),
  ],
)

/* ── Treatment plan + versions ───────────────────────────────────────────── */
export const treatmentPlan = pgTable(
  "treatment_plan",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    consultationOutcomeId: text("consultationOutcomeId").references(() => consultationOutcome.id, { onDelete: "set null" }),
    doctorId: text("doctorId").notNull().references(() => doctorProfile.id, { onDelete: "restrict" }),
    centerId: text("centerId").references(() => center.id, { onDelete: "set null" }),
    proposedProcedureId: text("proposedProcedureId").references(() => procedure.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    medicalAssessment: text("medicalAssessment"),
    expectedOutcomeDescription: text("expectedOutcomeDescription"),
    additionalProcedures: jsonb("additionalProcedures").notNull().default([]),
    alternatives: jsonb("alternatives").notNull().default([]),
    anesthesiaType: text("anesthesiaType"),
    estimatedProcedureDuration: text("estimatedProcedureDuration"),
    requiredHospitalStay: text("requiredHospitalStay"),
    recommendedLocalStay: text("recommendedLocalStay"),
    recoveryPeriod: text("recoveryPeriod"),
    preProcedureInstructions: text("preProcedureInstructions"),
    postProcedureInstructions: text("postProcedureInstructions"),
    requiredTests: jsonb("requiredTests").notNull().default([]),
    contraindications: text("contraindications"),
    mainRisks: text("mainRisks"),
    followUpScheduleSummary: text("followUpScheduleSummary"),
    validityFrom: date("validityFrom"),
    validityUntil: date("validityUntil"),
    status: treatmentPlanStatusEnum("status").notNull().default("DRAFT"),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("publishedAt", { withTimezone: true }),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("plan_case_idx").on(t.caseId), index("plan_status_idx").on(t.status)],
)

export const treatmentPlanVersion = pgTable(
  "treatment_plan_version",
  {
    id: id(),
    treatmentPlanId: text("treatmentPlanId").notNull().references(() => treatmentPlan.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: text("createdBy"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plan_version_plan_idx").on(t.treatmentPlanId)],
)

/* ── Quotes ──────────────────────────────────────────────────────────────── */
export const quote = pgTable(
  "quote",
  {
    id: id(),
    quoteNumber: text("quoteNumber").notNull().unique(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    treatmentPlanId: text("treatmentPlanId").references(() => treatmentPlan.id, { onDelete: "set null" }),
    patientUserId: text("patientUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    doctorId: text("doctorId").references(() => doctorProfile.id, { onDelete: "set null" }),
    centerId: text("centerId").references(() => center.id, { onDelete: "set null" }),
    currency: text("currency").notNull().default("SAR"),
    issueDate: timestamp("issueDate", { withTimezone: true }).notNull().defaultNow(),
    expiryDate: timestamp("expiryDate", { withTimezone: true }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    depositRequired: numeric("depositRequired", { precision: 12, scale: 2 }).notNull().default("0"),
    remainingBalance: numeric("remainingBalance", { precision: 12, scale: 2 }).notNull().default("0"),
    includedItems: text("includedItems"),
    excludedItems: text("excludedItems"),
    cancellationPolicy: text("cancellationPolicy"),
    refundPolicy: text("refundPolicy"),
    notes: text("notes"),
    status: quoteStatusEnum("status").notNull().default("DRAFT"),
    version: integer("version").notNull().default(1),
    viewedAt: timestamp("viewedAt", { withTimezone: true }),
    acceptedAt: timestamp("acceptedAt", { withTimezone: true }),
    acceptedIp: text("acceptedIp"),
    acceptedUserAgent: text("acceptedUserAgent"),
    rejectedAt: timestamp("rejectedAt", { withTimezone: true }),
    rejectionReason: text("rejectionReason"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("quote_case_idx").on(t.caseId), index("quote_status_idx").on(t.status)],
)

export const quoteItem = pgTable(
  "quote_item",
  {
    id: id(),
    quoteId: text("quoteId").notNull().references(() => quote.id, { onDelete: "cascade" }),
    category: quoteItemCategoryEnum("category").notNull().default("OTHER"),
    descriptionAr: text("descriptionAr").notNull(),
    descriptionEn: text("descriptionEn"),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
    taxRate: numeric("taxRate", { precision: 5, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sortOrder").notNull().default(0),
  },
  (t) => [index("quote_item_quote_idx").on(t.quoteId)],
)

export const quoteStatusHistory = pgTable(
  "quote_status_history",
  {
    id: id(),
    quoteId: text("quoteId").notNull().references(() => quote.id, { onDelete: "cascade" }),
    fromStatus: quoteStatusEnum("fromStatus"),
    toStatus: quoteStatusEnum("toStatus").notNull(),
    changedBy: text("changedBy"),
    note: text("note"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quote_history_quote_idx").on(t.quoteId)],
)

/* ── Medical approval ────────────────────────────────────────────────────── */
export const medicalApproval = pgTable(
  "medical_approval",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    treatmentPlanId: text("treatmentPlanId").references(() => treatmentPlan.id, { onDelete: "set null" }),
    doctorId: text("doctorId").notNull().references(() => doctorProfile.id, { onDelete: "restrict" }),
    status: medicalApprovalStatusEnum("status").notNull().default("PENDING"),
    requiredTestsCompleted: boolean("requiredTestsCompleted").notNull().default(false),
    documentsReviewed: boolean("documentsReviewed").notNull().default(false),
    finalAssessment: text("finalAssessment"),
    conditions: text("conditions"),
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
    approvedAt: timestamp("approvedAt", { withTimezone: true }),
    rejectedAt: timestamp("rejectedAt", { withTimezone: true }),
    rejectionReason: text("rejectionReason"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("approval_case_idx").on(t.caseId), index("approval_status_idx").on(t.status)],
)

/* ── Procedure booking + record ──────────────────────────────────────────── */
export const procedureBooking = pgTable(
  "procedure_booking",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    patientUserId: text("patientUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    doctorId: text("doctorId").notNull().references(() => doctorProfile.id, { onDelete: "restrict" }),
    centerId: text("centerId").references(() => center.id, { onDelete: "set null" }),
    procedureId: text("procedureId").references(() => procedure.id, { onDelete: "set null" }),
    medicalApprovalId: text("medicalApprovalId").references(() => medicalApproval.id, { onDelete: "set null" }),
    quoteId: text("quoteId").references(() => quote.id, { onDelete: "set null" }),
    depositPaymentId: text("depositPaymentId").references(() => payment.id, { onDelete: "set null" }),
    coordinatorId: text("coordinatorId").references(() => user.id, { onDelete: "set null" }),
    scheduledDate: date("scheduledDate"),
    scheduledStartAt: timestamp("scheduledStartAt", { withTimezone: true }),
    estimatedEndAt: timestamp("estimatedEndAt", { withTimezone: true }),
    operatingRoom: text("operatingRoom"),
    status: procedureBookingStatusEnum("status").notNull().default("PENDING_MEDICAL_APPROVAL"),
    centerConfirmationNotes: text("centerConfirmationNotes"),
    patientInstructionsAcknowledgedAt: timestamp("patientInstructionsAcknowledgedAt", { withTimezone: true }),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("pbooking_case_idx").on(t.caseId), index("pbooking_status_idx").on(t.status)],
)

export const procedureBookingHistory = pgTable(
  "procedure_booking_history",
  {
    id: id(),
    procedureBookingId: text("procedureBookingId").notNull().references(() => procedureBooking.id, { onDelete: "cascade" }),
    fromStatus: procedureBookingStatusEnum("fromStatus"),
    toStatus: procedureBookingStatusEnum("toStatus").notNull(),
    changedBy: text("changedBy"),
    note: text("note"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pbooking_history_idx").on(t.procedureBookingId)],
)

export const procedureRecord = pgTable(
  "procedure_record",
  {
    id: id(),
    procedureBookingId: text("procedureBookingId").notNull().references(() => procedureBooking.id, { onDelete: "cascade" }),
    performedByDoctorId: text("performedByDoctorId").references(() => doctorProfile.id, { onDelete: "set null" }),
    actualStartAt: timestamp("actualStartAt", { withTimezone: true }),
    actualEndAt: timestamp("actualEndAt", { withTimezone: true }),
    anesthesiaType: text("anesthesiaType"),
    assistingStaff: text("assistingStaff"),
    notes: text("notes"),
    dischargeAt: timestamp("dischargeAt", { withTimezone: true }),
    followUpPlanCreated: boolean("followUpPlanCreated").notNull().default(false),
    status: text("status").notNull().default("RECORDED"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [uniqueIndex("precord_booking_idx").on(t.procedureBookingId)],
)

/* ── Pre-procedure checklist ─────────────────────────────────────────────── */
export const preProcedureChecklist = pgTable(
  "pre_procedure_checklist",
  {
    id: id(),
    procedureBookingId: text("procedureBookingId").notNull().references(() => procedureBooking.id, { onDelete: "cascade" }),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    ...lifecycle(),
  },
  (t) => [uniqueIndex("checklist_booking_idx").on(t.procedureBookingId)],
)

export const preProcedureItem = pgTable(
  "pre_procedure_item",
  {
    id: id(),
    checklistId: text("checklistId").notNull().references(() => preProcedureChecklist.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    required: boolean("required").notNull().default(true),
    dueDate: date("dueDate"),
    status: checklistItemStatusEnum("status").notNull().default("PENDING"),
    completedBy: text("completedBy"),
    completedAt: timestamp("completedAt", { withTimezone: true }),
    evidenceDocumentId: text("evidenceDocumentId").references(() => medicalDocument.id, { onDelete: "set null" }),
    sortOrder: integer("sortOrder").notNull().default(0),
  },
  (t) => [index("checklist_item_idx").on(t.checklistId)],
)

/* ── Invoices ────────────────────────────────────────────────────────────── */
export const invoice = pgTable(
  "invoice",
  {
    id: id(),
    invoiceNumber: text("invoiceNumber").notNull().unique(),
    patientUserId: text("patientUserId").notNull().references(() => user.id, { onDelete: "restrict" }),
    centerId: text("centerId").references(() => center.id, { onDelete: "set null" }),
    caseId: text("caseId").references(() => aestheticCase.id, { onDelete: "set null" }),
    quoteId: text("quoteId").references(() => quote.id, { onDelete: "set null" }),
    issueDate: timestamp("issueDate", { withTimezone: true }).notNull().defaultNow(),
    dueDate: timestamp("dueDate", { withTimezone: true }),
    currency: text("currency").notNull().default("SAR"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paidAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    remainingAmount: numeric("remainingAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("invoice_patient_idx").on(t.patientUserId), index("invoice_status_idx").on(t.status)],
)

export const invoiceItem = pgTable(
  "invoice_item",
  {
    id: id(),
    invoiceId: text("invoiceId").notNull().references(() => invoice.id, { onDelete: "cascade" }),
    descriptionAr: text("descriptionAr").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
    taxRate: numeric("taxRate", { precision: 5, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sortOrder").notNull().default(0),
  },
  (t) => [index("invoice_item_idx").on(t.invoiceId)],
)

export const creditNote = pgTable(
  "credit_note",
  {
    id: id(),
    creditNoteNumber: text("creditNoteNumber").notNull().unique(),
    invoiceId: text("invoiceId").notNull().references(() => invoice.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("credit_note_invoice_idx").on(t.invoiceId)],
)

/** Refund request lifecycle: request → finance review → (provider confirm) → process. */
export const refundRequest = pgTable(
  "refund_request",
  {
    id: id(),
    invoiceId: text("invoiceId").notNull().references(() => invoice.id, { onDelete: "restrict" }),
    paymentId: text("paymentId").references(() => payment.id, { onDelete: "set null" }),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    requestedByUserId: text("requestedByUserId").notNull().references(() => user.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    status: refundStatusEnum("status").notNull().default("REQUESTED"),
    reviewedBy: text("reviewedBy"),
    reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
    reviewNotes: text("reviewNotes"),
    providerConfirmedBy: text("providerConfirmedBy"),
    providerConfirmedAt: timestamp("providerConfirmedAt", { withTimezone: true }),
    creditNoteId: text("creditNoteId").references(() => creditNote.id, { onDelete: "set null" }),
    providerRefundId: text("providerRefundId"),
    processedAt: timestamp("processedAt", { withTimezone: true }),
    failureReason: text("failureReason"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("refund_invoice_idx").on(t.invoiceId),
    index("refund_case_idx").on(t.caseId),
    index("refund_status_idx").on(t.status),
    uniqueIndex("refund_provider_refund_idx").on(t.providerRefundId),
  ],
)

/* ── Follow-up ───────────────────────────────────────────────────────────── */
export const followUpPlan = pgTable(
  "follow_up_plan",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    procedureBookingId: text("procedureBookingId").references(() => procedureBooking.id, { onDelete: "set null" }),
    doctorId: text("doctorId").references(() => doctorProfile.id, { onDelete: "set null" }),
    title: text("title").notNull().default("خطة المتابعة"),
    ...lifecycle(),
  },
  (t) => [index("followup_plan_case_idx").on(t.caseId)],
)

export const followUpTask = pgTable(
  "follow_up_task",
  {
    id: id(),
    planId: text("planId").notNull().references(() => followUpPlan.id, { onDelete: "cascade" }),
    type: followUpTaskTypeEnum("type").notNull().default("GENERAL_CHECK"),
    title: text("title").notNull(),
    instructions: text("instructions"),
    requiredPhotos: integer("requiredPhotos").notNull().default(0),
    questionnaire: jsonb("questionnaire"),
    assignedTo: text("assignedTo"),
    dueAt: timestamp("dueAt", { withTimezone: true }),
    status: followUpTaskStatusEnum("status").notNull().default("SCHEDULED"),
    submittedAt: timestamp("submittedAt", { withTimezone: true }),
    reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
    reviewedBy: text("reviewedBy"),
    reviewNotes: text("reviewNotes"),
    completedAt: timestamp("completedAt", { withTimezone: true }),
    ...lifecycle(),
  },
  (t) => [index("followup_task_plan_idx").on(t.planId), index("followup_task_status_idx").on(t.status)],
)

export const followUpEntry = pgTable(
  "follow_up_entry",
  {
    id: id(),
    taskId: text("taskId").notNull().references(() => followUpTask.id, { onDelete: "cascade" }),
    authorUserId: text("authorUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    painScore: integer("painScore"),
    notes: text("notes"),
    answers: jsonb("answers"),
    documentIds: jsonb("documentIds").notNull().default([]),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("followup_entry_task_idx").on(t.taskId)],
)

export const symptomReport = pgTable(
  "symptom_report",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    patientUserId: text("patientUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    symptoms: jsonb("symptoms").notNull().default([]),
    description: text("description"),
    isWarningSign: boolean("isWarningSign").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("symptom_case_idx").on(t.caseId)],
)

export const safetyAlert = pgTable(
  "safety_alert",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    patientUserId: text("patientUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    symptomReportId: text("symptomReportId").references(() => symptomReport.id, { onDelete: "set null" }),
    severity: safetyAlertSeverityEnum("severity").notNull().default("MEDIUM"),
    status: safetyAlertStatusEnum("status").notNull().default("OPEN"),
    summary: text("summary"),
    assignedTo: text("assignedTo").references(() => user.id, { onDelete: "set null" }),
    acknowledgedAt: timestamp("acknowledgedAt", { withTimezone: true }),
    acknowledgedBy: text("acknowledgedBy"),
    resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
    resolvedBy: text("resolvedBy"),
    resolutionNotes: text("resolutionNotes"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("safety_case_idx").on(t.caseId),
    index("safety_status_idx").on(t.status),
    index("safety_assignee_idx").on(t.assignedTo),
  ],
)

/* ── Reviews ─────────────────────────────────────────────────────────────── */
export const review = pgTable(
  "review",
  {
    id: id(),
    caseId: text("caseId").references(() => aestheticCase.id, { onDelete: "set null" }),
    appointmentId: text("appointmentId").references(() => appointment.id, { onDelete: "set null" }),
    procedureBookingId: text("procedureBookingId").references(() => procedureBooking.id, { onDelete: "set null" }),
    patientUserId: text("patientUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    doctorId: text("doctorId").references(() => doctorProfile.id, { onDelete: "cascade" }),
    centerId: text("centerId").references(() => center.id, { onDelete: "cascade" }),
    doctorRating: integer("doctorRating"),
    centerRating: integer("centerRating"),
    communicationRating: integer("communicationRating"),
    priceClarityRating: integer("priceClarityRating"),
    followUpRating: integer("followUpRating"),
    overallRating: integer("overallRating").notNull(),
    comment: text("comment"),
    anonymousDisplay: boolean("anonymousDisplay").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    moderationStatus: reviewModerationStatusEnum("moderationStatus").notNull().default("PENDING"),
    providerResponse: text("providerResponse"),
    providerRespondedAt: timestamp("providerRespondedAt", { withTimezone: true }),
    hiddenReason: text("hiddenReason"),
    ...lifecycle(),
  },
  (t) => [
    index("review_doctor_idx").on(t.doctorId),
    index("review_center_idx").on(t.centerId),
    index("review_moderation_idx").on(t.moderationStatus),
    // one review per patient per transaction (appointment or procedure booking)
    uniqueIndex("review_unique_appointment").on(t.patientUserId, t.appointmentId),
  ],
)

export const reviewReport = pgTable(
  "review_report",
  {
    id: id(),
    reviewId: text("reviewId").notNull().references(() => review.id, { onDelete: "cascade" }),
    reporterUserId: text("reporterUserId").references(() => user.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_report_idx").on(t.reviewId)],
)

/* ── Conversations & messages ────────────────────────────────────────────── */
export const conversation = pgTable(
  "conversation",
  {
    id: id(),
    caseId: text("caseId").references(() => aestheticCase.id, { onDelete: "cascade" }),
    subject: text("subject"),
    ...lifecycle(),
  },
  (t) => [index("conversation_case_idx").on(t.caseId)],
)

export const conversationParticipant = pgTable(
  "conversation_participant",
  {
    id: id(),
    conversationId: text("conversationId").notNull().references(() => conversation.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role"),
    lastReadAt: timestamp("lastReadAt", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("conv_participant_unique").on(t.conversationId, t.userId),
    index("conv_participant_user_idx").on(t.userId),
  ],
)

export const message = pgTable(
  "message",
  {
    id: id(),
    conversationId: text("conversationId").notNull().references(() => conversation.id, { onDelete: "cascade" }),
    senderUserId: text("senderUserId").notNull().references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    // existing medicalDocument ids the sender already has access to; visibility
    // for readers is still enforced per-document via canViewDocument.
    documentIds: jsonb("documentIds").notNull().default([]),
    isInternalNote: boolean("isInternalNote").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deletedAt", { withTimezone: true }),
  },
  (t) => [index("message_conversation_idx").on(t.conversationId)],
)

/* ── Notifications ───────────────────────────────────────────────────────── */
export const notification = pgTable(
  "notification",
  {
    id: id(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    caseId: text("caseId").references(() => aestheticCase.id, { onDelete: "set null" }),
    href: text("href"),
    readAt: timestamp("readAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notification_user_idx").on(t.userId), index("notification_read_idx").on(t.readAt)],
)

export const notificationDelivery = pgTable(
  "notification_delivery",
  {
    id: id(),
    notificationId: text("notificationId").notNull().references(() => notification.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    status: notificationDeliveryStatusEnum("status").notNull().default("PENDING"),
    error: text("error"),
    sentAt: timestamp("sentAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notif_delivery_idx").on(t.notificationId)],
)

/**
 * Per-user notification channel preferences. Missing row = defaults
 * (in-app + email on, SMS + WhatsApp off). Fine-grained event-level toggles
 * can layer on top later via `mutedEvents` (JSON array of event keys).
 *
 * A saved preference for a channel with no configured adapter is a no-op at
 * send-time: notificationDelivery records NOT_CONFIGURED so the UI can honestly
 * tell the user "you enabled SMS but SMS is not yet configured on the platform".
 */
export const notificationPreference = pgTable("notification_preference", {
  userId: text("userId").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  inAppEnabled: boolean("inAppEnabled").notNull().default(true),
  emailEnabled: boolean("emailEnabled").notNull().default(true),
  smsEnabled: boolean("smsEnabled").notNull().default(false),
  whatsappEnabled: boolean("whatsappEnabled").notNull().default(false),
  // Optional phone override; when null the user profile phone is used.
  smsPhone: text("smsPhone"),
  whatsappPhone: text("whatsappPhone"),
  mutedEvents: text("mutedEvents").array().notNull().default([]),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})

/* ── Internal tasks (ops/concierge) ──────────────────────────────────────── */
export const internalTask = pgTable(
  "internal_task",
  {
    id: id(),
    caseId: text("caseId").references(() => aestheticCase.id, { onDelete: "cascade" }),
    assignedTo: text("assignedTo").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").notNull().default("normal"),
    status: internalTaskStatusEnum("status").notNull().default("OPEN"),
    dueAt: timestamp("dueAt", { withTimezone: true }),
    completedAt: timestamp("completedAt", { withTimezone: true }),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("internal_task_case_idx").on(t.caseId),
    index("internal_task_assignee_idx").on(t.assignedTo),
    index("internal_task_status_idx").on(t.status),
  ],
)

/** Closure record: one per closure event (a case can be reopened + re-closed). */
export const caseClosure = pgTable(
  "case_closure",
  {
    id: id(),
    caseId: text("caseId").notNull().references(() => aestheticCase.id, { onDelete: "cascade" }),
    closedBy: text("closedBy").notNull(),
    closedAt: timestamp("closedAt", { withTimezone: true }).notNull().defaultNow(),
    reason: text("reason"),
    reopenedBy: text("reopenedBy"),
    reopenedAt: timestamp("reopenedAt", { withTimezone: true }),
    reopenReason: text("reopenReason"),
  },
  (t) => [index("case_closure_case_idx").on(t.caseId)],
)
