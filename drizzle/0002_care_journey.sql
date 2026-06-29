CREATE TYPE "public"."checklist_item_status" AS ENUM('PENDING', 'COMPLETED', 'WAIVED', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."follow_up_task_status" AS ENUM('SCHEDULED', 'DUE', 'COMPLETED', 'MISSED', 'ESCALATED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."follow_up_task_type" AS ENUM('PHOTO_UPLOAD', 'QUESTIONNAIRE', 'VIDEO_APPOINTMENT', 'IN_PERSON_APPOINTMENT', 'MEDICATION_REMINDER', 'GENERAL_CHECK', 'DOCTOR_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."medical_approval_status" AS ENUM('PENDING', 'ADDITIONAL_TESTS_REQUIRED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED');--> statement-breakpoint
CREATE TYPE "public"."procedure_booking_status" AS ENUM('PENDING_MEDICAL_APPROVAL', 'PENDING_CENTER_CONFIRMATION', 'PENDING_PATIENT_REQUIREMENTS', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."quote_item_category" AS ENUM('DOCTOR_FEE', 'CENTER_FEE', 'OPERATING_ROOM', 'ANESTHESIA', 'LAB_TESTS', 'MEDICATIONS', 'MEDICAL_GARMENT', 'HOSPITAL_STAY', 'FOLLOW_UP', 'TRANSPORT', 'HOTEL', 'TRANSLATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."review_moderation_status" AS ENUM('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED', 'REPORTED');--> statement-breakpoint
CREATE TYPE "public"."safety_alert_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."safety_alert_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'CONTACTED', 'RESOLVED', 'REFERRED_TO_EMERGENCY');--> statement-breakpoint
CREATE TYPE "public"."suitability_status" AS ENUM('PENDING', 'SUITABLE_PRELIMINARILY', 'MORE_INFORMATION_REQUIRED', 'IN_PERSON_ASSESSMENT_REQUIRED', 'NOT_SUITABLE', 'REFERRED_ELSEWHERE');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_status" AS ENUM('DRAFT', 'PUBLISHED', 'REVISED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "consultation_outcome" (
	"id" text PRIMARY KEY NOT NULL,
	"appointmentId" text NOT NULL,
	"caseId" text NOT NULL,
	"doctorId" text NOT NULL,
	"patientUserId" text NOT NULL,
	"suitabilityStatus" "suitability_status" DEFAULT 'PENDING' NOT NULL,
	"clinicalSummary" text,
	"patientVisibleNotes" text,
	"internalNotes" text,
	"additionalInformationRequired" text,
	"additionalDocumentsRequested" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"labTestsRequested" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inPersonAssessmentRequired" boolean DEFAULT false NOT NULL,
	"notSuitableReason" text,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text,
	"subject" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text,
	"lastReadAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "credit_note" (
	"id" text PRIMARY KEY NOT NULL,
	"creditNoteNumber" text NOT NULL,
	"invoiceId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "credit_note_creditNoteNumber_unique" UNIQUE("creditNoteNumber")
);
--> statement-breakpoint
CREATE TABLE "follow_up_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"authorUserId" text NOT NULL,
	"painScore" integer,
	"notes" text,
	"answers" jsonb,
	"documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"procedureBookingId" text,
	"doctorId" text,
	"title" text DEFAULT 'خطة المتابعة' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "follow_up_task" (
	"id" text PRIMARY KEY NOT NULL,
	"planId" text NOT NULL,
	"type" "follow_up_task_type" DEFAULT 'GENERAL_CHECK' NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"requiredPhotos" integer DEFAULT 0 NOT NULL,
	"questionnaire" jsonb,
	"assignedTo" text,
	"dueAt" timestamp with time zone,
	"status" "follow_up_task_status" DEFAULT 'SCHEDULED' NOT NULL,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "internal_task" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text,
	"assignedTo" text,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"dueAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceNumber" text NOT NULL,
	"patientUserId" text NOT NULL,
	"centerId" text,
	"caseId" text,
	"quoteId" text,
	"issueDate" timestamp with time zone DEFAULT now() NOT NULL,
	"dueDate" timestamp with time zone,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paidAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"remainingAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "invoice_invoiceNumber_unique" UNIQUE("invoiceNumber")
);
--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"descriptionAr" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitPrice" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_approval" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"treatmentPlanId" text,
	"doctorId" text NOT NULL,
	"status" "medical_approval_status" DEFAULT 'PENDING' NOT NULL,
	"requiredTestsCompleted" boolean DEFAULT false NOT NULL,
	"documentsReviewed" boolean DEFAULT false NOT NULL,
	"finalAssessment" text,
	"conditions" text,
	"expiresAt" timestamp with time zone,
	"approvedAt" timestamp with time zone,
	"rejectedAt" timestamp with time zone,
	"rejectionReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"senderUserId" text NOT NULL,
	"body" text NOT NULL,
	"isInternalNote" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"caseId" text,
	"href" text,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"notificationId" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"sentAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_procedure_checklist" (
	"id" text PRIMARY KEY NOT NULL,
	"procedureBookingId" text NOT NULL,
	"caseId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pre_procedure_item" (
	"id" text PRIMARY KEY NOT NULL,
	"checklistId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"required" boolean DEFAULT true NOT NULL,
	"dueDate" date,
	"status" "checklist_item_status" DEFAULT 'PENDING' NOT NULL,
	"completedBy" text,
	"completedAt" timestamp with time zone,
	"evidenceDocumentId" text,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_booking" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"patientUserId" text NOT NULL,
	"doctorId" text NOT NULL,
	"centerId" text,
	"procedureId" text,
	"medicalApprovalId" text,
	"quoteId" text,
	"depositPaymentId" text,
	"coordinatorId" text,
	"scheduledDate" date,
	"scheduledStartAt" timestamp with time zone,
	"estimatedEndAt" timestamp with time zone,
	"operatingRoom" text,
	"status" "procedure_booking_status" DEFAULT 'PENDING_MEDICAL_APPROVAL' NOT NULL,
	"centerConfirmationNotes" text,
	"patientInstructionsAcknowledgedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "procedure_booking_history" (
	"id" text PRIMARY KEY NOT NULL,
	"procedureBookingId" text NOT NULL,
	"fromStatus" "procedure_booking_status",
	"toStatus" "procedure_booking_status" NOT NULL,
	"changedBy" text,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_record" (
	"id" text PRIMARY KEY NOT NULL,
	"procedureBookingId" text NOT NULL,
	"performedByDoctorId" text,
	"actualStartAt" timestamp with time zone,
	"actualEndAt" timestamp with time zone,
	"anesthesiaType" text,
	"assistingStaff" text,
	"notes" text,
	"dischargeAt" timestamp with time zone,
	"followUpPlanCreated" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'RECORDED' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "quote" (
	"id" text PRIMARY KEY NOT NULL,
	"quoteNumber" text NOT NULL,
	"caseId" text NOT NULL,
	"treatmentPlanId" text,
	"patientUserId" text NOT NULL,
	"doctorId" text,
	"centerId" text,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"issueDate" timestamp with time zone DEFAULT now() NOT NULL,
	"expiryDate" timestamp with time zone,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"depositRequired" numeric(12, 2) DEFAULT '0' NOT NULL,
	"remainingBalance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"includedItems" text,
	"excludedItems" text,
	"cancellationPolicy" text,
	"refundPolicy" text,
	"notes" text,
	"status" "quote_status" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"viewedAt" timestamp with time zone,
	"acceptedAt" timestamp with time zone,
	"acceptedIp" text,
	"acceptedUserAgent" text,
	"rejectedAt" timestamp with time zone,
	"rejectionReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "quote_quoteNumber_unique" UNIQUE("quoteNumber")
);
--> statement-breakpoint
CREATE TABLE "quote_item" (
	"id" text PRIMARY KEY NOT NULL,
	"quoteId" text NOT NULL,
	"category" "quote_item_category" DEFAULT 'OTHER' NOT NULL,
	"descriptionAr" text NOT NULL,
	"descriptionEn" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitPrice" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"quoteId" text NOT NULL,
	"fromStatus" "quote_status",
	"toStatus" "quote_status" NOT NULL,
	"changedBy" text,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text,
	"appointmentId" text,
	"procedureBookingId" text,
	"patientUserId" text NOT NULL,
	"doctorId" text,
	"centerId" text,
	"doctorRating" integer,
	"centerRating" integer,
	"communicationRating" integer,
	"priceClarityRating" integer,
	"followUpRating" integer,
	"overallRating" integer NOT NULL,
	"comment" text,
	"anonymousDisplay" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"moderationStatus" "review_moderation_status" DEFAULT 'PENDING' NOT NULL,
	"providerResponse" text,
	"providerRespondedAt" timestamp with time zone,
	"hiddenReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_report" (
	"id" text PRIMARY KEY NOT NULL,
	"reviewId" text NOT NULL,
	"reporterUserId" text,
	"reason" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"patientUserId" text NOT NULL,
	"symptomReportId" text,
	"severity" "safety_alert_severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "safety_alert_status" DEFAULT 'OPEN' NOT NULL,
	"summary" text,
	"acknowledgedAt" timestamp with time zone,
	"acknowledgedBy" text,
	"resolvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "symptom_report" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"patientUserId" text NOT NULL,
	"symptoms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"isWarningSign" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"consultationOutcomeId" text,
	"doctorId" text NOT NULL,
	"centerId" text,
	"proposedProcedureId" text,
	"title" text NOT NULL,
	"medicalAssessment" text,
	"expectedOutcomeDescription" text,
	"additionalProcedures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"anesthesiaType" text,
	"estimatedProcedureDuration" text,
	"requiredHospitalStay" text,
	"recommendedLocalStay" text,
	"recoveryPeriod" text,
	"preProcedureInstructions" text,
	"postProcedureInstructions" text,
	"requiredTests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contraindications" text,
	"mainRisks" text,
	"followUpScheduleSummary" text,
	"validityFrom" date,
	"validityUntil" date,
	"status" "treatment_plan_status" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_version" (
	"id" text PRIMARY KEY NOT NULL,
	"treatmentPlanId" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"createdBy" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consultation_outcome" ADD CONSTRAINT "consultation_outcome_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_outcome" ADD CONSTRAINT "consultation_outcome_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_outcome" ADD CONSTRAINT "consultation_outcome_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_outcome" ADD CONSTRAINT "consultation_outcome_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note" ADD CONSTRAINT "credit_note_invoiceId_invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_entry" ADD CONSTRAINT "follow_up_entry_taskId_follow_up_task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."follow_up_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_entry" ADD CONSTRAINT "follow_up_entry_authorUserId_user_id_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_plan" ADD CONSTRAINT "follow_up_plan_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_plan" ADD CONSTRAINT "follow_up_plan_procedureBookingId_procedure_booking_id_fk" FOREIGN KEY ("procedureBookingId") REFERENCES "public"."procedure_booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_plan" ADD CONSTRAINT "follow_up_plan_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_task" ADD CONSTRAINT "follow_up_task_planId_follow_up_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."follow_up_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_task" ADD CONSTRAINT "internal_task_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_task" ADD CONSTRAINT "internal_task_assignedTo_user_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quoteId_quote_id_fk" FOREIGN KEY ("quoteId") REFERENCES "public"."quote"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoiceId_invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_approval" ADD CONSTRAINT "medical_approval_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_approval" ADD CONSTRAINT "medical_approval_treatmentPlanId_treatment_plan_id_fk" FOREIGN KEY ("treatmentPlanId") REFERENCES "public"."treatment_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_approval" ADD CONSTRAINT "medical_approval_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_senderUserId_user_id_fk" FOREIGN KEY ("senderUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_notificationId_notification_id_fk" FOREIGN KEY ("notificationId") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_procedure_checklist" ADD CONSTRAINT "pre_procedure_checklist_procedureBookingId_procedure_booking_id_fk" FOREIGN KEY ("procedureBookingId") REFERENCES "public"."procedure_booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_procedure_checklist" ADD CONSTRAINT "pre_procedure_checklist_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_procedure_item" ADD CONSTRAINT "pre_procedure_item_checklistId_pre_procedure_checklist_id_fk" FOREIGN KEY ("checklistId") REFERENCES "public"."pre_procedure_checklist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_procedure_item" ADD CONSTRAINT "pre_procedure_item_evidenceDocumentId_medical_document_id_fk" FOREIGN KEY ("evidenceDocumentId") REFERENCES "public"."medical_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_procedureId_procedure_id_fk" FOREIGN KEY ("procedureId") REFERENCES "public"."procedure"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_medicalApprovalId_medical_approval_id_fk" FOREIGN KEY ("medicalApprovalId") REFERENCES "public"."medical_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_quoteId_quote_id_fk" FOREIGN KEY ("quoteId") REFERENCES "public"."quote"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_depositPaymentId_payment_id_fk" FOREIGN KEY ("depositPaymentId") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking" ADD CONSTRAINT "procedure_booking_coordinatorId_user_id_fk" FOREIGN KEY ("coordinatorId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_booking_history" ADD CONSTRAINT "procedure_booking_history_procedureBookingId_procedure_booking_id_fk" FOREIGN KEY ("procedureBookingId") REFERENCES "public"."procedure_booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_record" ADD CONSTRAINT "procedure_record_procedureBookingId_procedure_booking_id_fk" FOREIGN KEY ("procedureBookingId") REFERENCES "public"."procedure_booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_record" ADD CONSTRAINT "procedure_record_performedByDoctorId_doctor_profile_id_fk" FOREIGN KEY ("performedByDoctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_treatmentPlanId_treatment_plan_id_fk" FOREIGN KEY ("treatmentPlanId") REFERENCES "public"."treatment_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_item" ADD CONSTRAINT "quote_item_quoteId_quote_id_fk" FOREIGN KEY ("quoteId") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_status_history" ADD CONSTRAINT "quote_status_history_quoteId_quote_id_fk" FOREIGN KEY ("quoteId") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_procedureBookingId_procedure_booking_id_fk" FOREIGN KEY ("procedureBookingId") REFERENCES "public"."procedure_booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_reviewId_review_id_fk" FOREIGN KEY ("reviewId") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_reporterUserId_user_id_fk" FOREIGN KEY ("reporterUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD CONSTRAINT "safety_alert_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD CONSTRAINT "safety_alert_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD CONSTRAINT "safety_alert_symptomReportId_symptom_report_id_fk" FOREIGN KEY ("symptomReportId") REFERENCES "public"."symptom_report"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_report" ADD CONSTRAINT "symptom_report_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_report" ADD CONSTRAINT "symptom_report_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan" ADD CONSTRAINT "treatment_plan_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan" ADD CONSTRAINT "treatment_plan_consultationOutcomeId_consultation_outcome_id_fk" FOREIGN KEY ("consultationOutcomeId") REFERENCES "public"."consultation_outcome"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan" ADD CONSTRAINT "treatment_plan_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan" ADD CONSTRAINT "treatment_plan_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan" ADD CONSTRAINT "treatment_plan_proposedProcedureId_procedure_id_fk" FOREIGN KEY ("proposedProcedureId") REFERENCES "public"."procedure"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_version" ADD CONSTRAINT "treatment_plan_version_treatmentPlanId_treatment_plan_id_fk" FOREIGN KEY ("treatmentPlanId") REFERENCES "public"."treatment_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outcome_appointment_idx" ON "consultation_outcome" USING btree ("appointmentId");--> statement-breakpoint
CREATE INDEX "outcome_case_idx" ON "consultation_outcome" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "conversation_case_idx" ON "conversation" USING btree ("caseId");--> statement-breakpoint
CREATE UNIQUE INDEX "conv_participant_unique" ON "conversation_participant" USING btree ("conversationId","userId");--> statement-breakpoint
CREATE INDEX "conv_participant_user_idx" ON "conversation_participant" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "credit_note_invoice_idx" ON "credit_note" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "followup_entry_task_idx" ON "follow_up_entry" USING btree ("taskId");--> statement-breakpoint
CREATE INDEX "followup_plan_case_idx" ON "follow_up_plan" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "followup_task_plan_idx" ON "follow_up_task" USING btree ("planId");--> statement-breakpoint
CREATE INDEX "followup_task_status_idx" ON "follow_up_task" USING btree ("status");--> statement-breakpoint
CREATE INDEX "internal_task_case_idx" ON "internal_task" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "internal_task_assignee_idx" ON "internal_task" USING btree ("assignedTo");--> statement-breakpoint
CREATE INDEX "invoice_patient_idx" ON "invoice" USING btree ("patientUserId");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_item_idx" ON "invoice_item" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "approval_case_idx" ON "medical_approval" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "approval_status_idx" ON "medical_approval" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_conversation_idx" ON "message" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "notification" USING btree ("readAt");--> statement-breakpoint
CREATE INDEX "notif_delivery_idx" ON "notification_delivery" USING btree ("notificationId");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_booking_idx" ON "pre_procedure_checklist" USING btree ("procedureBookingId");--> statement-breakpoint
CREATE INDEX "checklist_item_idx" ON "pre_procedure_item" USING btree ("checklistId");--> statement-breakpoint
CREATE INDEX "pbooking_case_idx" ON "procedure_booking" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "pbooking_status_idx" ON "procedure_booking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pbooking_history_idx" ON "procedure_booking_history" USING btree ("procedureBookingId");--> statement-breakpoint
CREATE UNIQUE INDEX "precord_booking_idx" ON "procedure_record" USING btree ("procedureBookingId");--> statement-breakpoint
CREATE INDEX "quote_case_idx" ON "quote" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "quote_status_idx" ON "quote" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quote_item_quote_idx" ON "quote_item" USING btree ("quoteId");--> statement-breakpoint
CREATE INDEX "quote_history_quote_idx" ON "quote_status_history" USING btree ("quoteId");--> statement-breakpoint
CREATE INDEX "review_doctor_idx" ON "review" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "review_center_idx" ON "review" USING btree ("centerId");--> statement-breakpoint
CREATE INDEX "review_moderation_idx" ON "review" USING btree ("moderationStatus");--> statement-breakpoint
CREATE UNIQUE INDEX "review_unique_appointment" ON "review" USING btree ("patientUserId","appointmentId");--> statement-breakpoint
CREATE INDEX "review_report_idx" ON "review_report" USING btree ("reviewId");--> statement-breakpoint
CREATE INDEX "safety_case_idx" ON "safety_alert" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "safety_status_idx" ON "safety_alert" USING btree ("status");--> statement-breakpoint
CREATE INDEX "symptom_case_idx" ON "symptom_report" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "plan_case_idx" ON "treatment_plan" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "plan_status_idx" ON "treatment_plan" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plan_version_plan_idx" ON "treatment_plan_version" USING btree ("treatmentPlanId");