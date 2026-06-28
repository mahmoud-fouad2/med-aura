CREATE TYPE "public"."application_kind" AS ENUM('DOCTOR', 'CENTER');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDING_PAYMENT', 'PENDING_PROVIDER_CONFIRMATION', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('VIDEO_CONSULTATION', 'IN_PERSON_CONSULTATION', 'PHONE_CONSULTATION', 'PROCEDURE', 'FOLLOW_UP');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('DRAFT', 'SUBMITTED', 'MATCHING', 'SHARED_WITH_PROVIDER', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'CONSULTATION_REQUIRED', 'CONSULTATION_BOOKED', 'CONSULTATION_COMPLETED', 'TREATMENT_PLAN_ISSUED', 'QUOTE_ISSUED', 'PATIENT_REVIEWING', 'QUOTE_ACCEPTED', 'DEPOSIT_PAID', 'MEDICALLY_APPROVED', 'CENTER_CONFIRMED', 'FULLY_PAID', 'PROCEDURE_CONFIRMED', 'PROCEDURE_COMPLETED', 'FOLLOW_UP', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('GRANTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('CASE_PHOTO', 'MEDICAL_REPORT', 'LAB_RESULT', 'ID_DOCUMENT', 'LICENSE', 'CERTIFICATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."license_status" AS ENUM('PENDING', 'VALID', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('CONSULTATION_FEE', 'DEPOSIT', 'PARTIAL_PAYMENT', 'FINAL_PAYMENT', 'SERVICE_FEE');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'suspended');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "permission_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"nameAr" text NOT NULL,
	"nameEn" text NOT NULL,
	"description" text,
	"isSystem" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "role_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"roleId" text NOT NULL,
	"permissionId" text NOT NULL,
	CONSTRAINT "role_permission_roleId_permissionId_pk" PRIMARY KEY("roleId","permissionId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'patient' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"phone" text,
	"country" text,
	"locale" text DEFAULT 'ar' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"centerId" text,
	"grantedBy" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" text PRIMARY KEY NOT NULL,
	"countryId" text NOT NULL,
	"nameAr" text NOT NULL,
	"nameEn" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "country" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"nameAr" text NOT NULL,
	"nameEn" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "country_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "procedure" (
	"id" text PRIMARY KEY NOT NULL,
	"categoryId" text NOT NULL,
	"slug" text NOT NULL,
	"nameAr" text NOT NULL,
	"nameEn" text NOT NULL,
	"descriptionAr" text,
	"descriptionEn" text,
	"isSurgical" boolean DEFAULT false NOT NULL,
	"recoveryDays" integer,
	"requiredConsultation" text,
	"seoTitleAr" text,
	"seoTitleEn" text,
	"seoDescriptionAr" text,
	"seoDescriptionEn" text,
	"visible" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "procedure_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "procedure_category" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nameAr" text NOT NULL,
	"nameEn" text NOT NULL,
	"descriptionAr" text,
	"descriptionEn" text,
	"icon" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "procedure_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "patient_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dateOfBirth" date,
	"nationality" text,
	"residenceCountry" text,
	"city" text,
	"language" text DEFAULT 'ar' NOT NULL,
	"phone" text,
	"emergencyContactName" text,
	"emergencyContactPhone" text,
	"onboardingCompleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "center" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text,
	"legalName" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"country" text NOT NULL,
	"city" text,
	"address" text,
	"phone" text,
	"email" text,
	"website" text,
	"logoKey" text,
	"coverKey" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"rating" numeric(2, 1),
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"status" "provider_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "center_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "doctor_license" (
	"id" text PRIMARY KEY NOT NULL,
	"doctorId" text NOT NULL,
	"numberEncrypted" text NOT NULL,
	"numberLast4" text,
	"issuingAuthority" text NOT NULL,
	"issueDate" date,
	"expiryDate" date NOT NULL,
	"documentKey" text,
	"status" "license_status" DEFAULT 'PENDING' NOT NULL,
	"lastVerifiedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "doctor_procedure" (
	"doctorId" text NOT NULL,
	"procedureId" text NOT NULL,
	"priceFrom" numeric(12, 2),
	"currency" text DEFAULT 'SAR' NOT NULL,
	CONSTRAINT "doctor_procedure_doctorId_procedureId_pk" PRIMARY KEY("doctorId","procedureId")
);
--> statement-breakpoint
CREATE TABLE "doctor_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"centerId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"title" text,
	"bio" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"country" text NOT NULL,
	"city" text,
	"photoKey" text,
	"yearsExperience" integer DEFAULT 0 NOT NULL,
	"consultationFee" numeric(12, 2),
	"currency" text DEFAULT 'SAR' NOT NULL,
	"offersVideo" boolean DEFAULT false NOT NULL,
	"offersInPerson" boolean DEFAULT true NOT NULL,
	"rating" numeric(2, 1),
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"status" "provider_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "doctor_profile_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "provider_application" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "application_kind" NOT NULL,
	"applicantUserId" text NOT NULL,
	"status" "application_status" DEFAULT 'DRAFT' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewerNotes" text,
	"submittedAt" timestamp with time zone,
	"decidedAt" timestamp with time zone,
	"resultingDoctorId" text,
	"resultingCenterId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "verification_review" (
	"id" text PRIMARY KEY NOT NULL,
	"applicationId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aesthetic_case" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"patientUserId" text NOT NULL,
	"procedureId" text NOT NULL,
	"doctorId" text,
	"centerId" text,
	"status" "case_status" DEFAULT 'DRAFT' NOT NULL,
	"goal" text,
	"description" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ageYears" integer,
	"preferredCountry" text,
	"preferredCity" text,
	"budgetAmount" numeric(12, 2),
	"budgetCurrency" text DEFAULT 'SAR',
	"needsTravel" boolean DEFAULT false NOT NULL,
	"consentToShare" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "aesthetic_case_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "case_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"fromStatus" "case_status",
	"toStatus" "case_status" NOT NULL,
	"changedBy" text,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"patientUserId" text NOT NULL,
	"granteeUserId" text NOT NULL,
	"purpose" text DEFAULT 'consultation_review' NOT NULL,
	"status" "consent_status" DEFAULT 'GRANTED' NOT NULL,
	"grantedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_access_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"consentId" text NOT NULL,
	"granteeUserId" text NOT NULL,
	"grantedBy" text NOT NULL,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_document" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text,
	"ownerUserId" text NOT NULL,
	"kind" "document_kind" DEFAULT 'CASE_PHOTO' NOT NULL,
	"objectKey" text NOT NULL,
	"fileName" text NOT NULL,
	"contentType" text NOT NULL,
	"sizeBytes" integer DEFAULT 0 NOT NULL,
	"finalized" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"caseId" text,
	"patientUserId" text NOT NULL,
	"doctorId" text NOT NULL,
	"centerId" text,
	"type" "appointment_type" DEFAULT 'VIDEO_CONSULTATION' NOT NULL,
	"status" "appointment_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"startsAt" timestamp with time zone NOT NULL,
	"endsAt" timestamp with time zone NOT NULL,
	"priceAmount" numeric(12, 2),
	"currency" text DEFAULT 'SAR' NOT NULL,
	"patientNote" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "appointment_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "appointment_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"appointmentId" text NOT NULL,
	"fromStatus" "appointment_status",
	"toStatus" "appointment_status" NOT NULL,
	"changedBy" text,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"doctorId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" time NOT NULL,
	"endTime" time NOT NULL,
	"slotMinutes" integer DEFAULT 30 NOT NULL,
	"type" "appointment_type" DEFAULT 'VIDEO_CONSULTATION' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"payerUserId" text NOT NULL,
	"appointmentId" text,
	"caseId" text,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"providerIntentId" text,
	"providerSessionId" text,
	"failureReason" text,
	"paidAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "payment_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"eventId" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processedAt" timestamp with time zone,
	"error" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actorUserId" text,
	"action" text NOT NULL,
	"entityType" text,
	"entityId" text,
	"ip" text,
	"userAgent" text,
	"requestId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_permission_id_fk" FOREIGN KEY ("permissionId") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_roleId_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_countryId_country_id_fk" FOREIGN KEY ("countryId") REFERENCES "public"."country"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure" ADD CONSTRAINT "procedure_categoryId_procedure_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."procedure_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center" ADD CONSTRAINT "center_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_license" ADD CONSTRAINT "doctor_license_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_procedure" ADD CONSTRAINT "doctor_procedure_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_procedure" ADD CONSTRAINT "doctor_procedure_procedureId_procedure_id_fk" FOREIGN KEY ("procedureId") REFERENCES "public"."procedure"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD CONSTRAINT "doctor_profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD CONSTRAINT "doctor_profile_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application" ADD CONSTRAINT "provider_application_applicantUserId_user_id_fk" FOREIGN KEY ("applicantUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_review" ADD CONSTRAINT "verification_review_applicationId_provider_application_id_fk" FOREIGN KEY ("applicationId") REFERENCES "public"."provider_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_review" ADD CONSTRAINT "verification_review_reviewerId_user_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aesthetic_case" ADD CONSTRAINT "aesthetic_case_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aesthetic_case" ADD CONSTRAINT "aesthetic_case_procedureId_procedure_id_fk" FOREIGN KEY ("procedureId") REFERENCES "public"."procedure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aesthetic_case" ADD CONSTRAINT "aesthetic_case_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aesthetic_case" ADD CONSTRAINT "aesthetic_case_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_granteeUserId_user_id_fk" FOREIGN KEY ("granteeUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grant" ADD CONSTRAINT "document_access_grant_documentId_medical_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."medical_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grant" ADD CONSTRAINT "document_access_grant_consentId_consent_id_fk" FOREIGN KEY ("consentId") REFERENCES "public"."consent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grant" ADD CONSTRAINT "document_access_grant_granteeUserId_user_id_fk" FOREIGN KEY ("granteeUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_document" ADD CONSTRAINT "medical_document_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_document" ADD CONSTRAINT "medical_document_ownerUserId_user_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_rule_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payerUserId_user_id_fk" FOREIGN KEY ("payerUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_unique" ON "user_role" USING btree ("userId","roleId","centerId");--> statement-breakpoint
CREATE INDEX "user_role_user_idx" ON "user_role" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "city_country_idx" ON "city" USING btree ("countryId");--> statement-breakpoint
CREATE INDEX "procedure_category_idx" ON "procedure" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "procedure_visible_idx" ON "procedure" USING btree ("visible");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_slug_idx" ON "procedure" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "category_visible_idx" ON "procedure_category" USING btree ("visible");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_user_idx" ON "patient_profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "center_status_idx" ON "center" USING btree ("status");--> statement-breakpoint
CREATE INDEX "center_country_idx" ON "center" USING btree ("country");--> statement-breakpoint
CREATE INDEX "license_doctor_idx" ON "doctor_license" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "license_expiry_idx" ON "doctor_license" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "doctor_procedure_procedure_idx" ON "doctor_procedure" USING btree ("procedureId");--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_user_idx" ON "doctor_profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "doctor_status_idx" ON "doctor_profile" USING btree ("status");--> statement-breakpoint
CREATE INDEX "doctor_published_idx" ON "doctor_profile" USING btree ("published");--> statement-breakpoint
CREATE INDEX "doctor_country_idx" ON "doctor_profile" USING btree ("country");--> statement-breakpoint
CREATE INDEX "doctor_center_idx" ON "doctor_profile" USING btree ("centerId");--> statement-breakpoint
CREATE INDEX "application_status_idx" ON "provider_application" USING btree ("status");--> statement-breakpoint
CREATE INDEX "application_applicant_idx" ON "provider_application" USING btree ("applicantUserId");--> statement-breakpoint
CREATE INDEX "review_application_idx" ON "verification_review" USING btree ("applicationId");--> statement-breakpoint
CREATE INDEX "case_patient_idx" ON "aesthetic_case" USING btree ("patientUserId");--> statement-breakpoint
CREATE INDEX "case_doctor_idx" ON "aesthetic_case" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "case_status_idx" ON "aesthetic_case" USING btree ("status");--> statement-breakpoint
CREATE INDEX "case_history_case_idx" ON "case_status_history" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "consent_case_idx" ON "consent" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "consent_grantee_idx" ON "consent" USING btree ("granteeUserId");--> statement-breakpoint
CREATE INDEX "grant_document_idx" ON "document_access_grant" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "grant_grantee_idx" ON "document_access_grant" USING btree ("granteeUserId");--> statement-breakpoint
CREATE INDEX "document_case_idx" ON "medical_document" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "document_owner_idx" ON "medical_document" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "appointment_patient_idx" ON "appointment" USING btree ("patientUserId");--> statement-breakpoint
CREATE INDEX "appointment_doctor_idx" ON "appointment" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "appointment_starts_idx" ON "appointment" USING btree ("startsAt");--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_no_double_booking" ON "appointment" USING btree ("doctorId","startsAt") WHERE status NOT IN ('CANCELLED_BY_PATIENT','CANCELLED_BY_PROVIDER','NO_SHOW');--> statement-breakpoint
CREATE INDEX "appt_history_appt_idx" ON "appointment_status_history" USING btree ("appointmentId");--> statement-breakpoint
CREATE INDEX "availability_doctor_idx" ON "availability_rule" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "payment_payer_idx" ON "payment" USING btree ("payerUserId");--> statement-breakpoint
CREATE INDEX "payment_appointment_idx" ON "payment" USING btree ("appointmentId");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_intent_idx" ON "payment" USING btree ("providerIntentId");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_unique" ON "payment_webhook_event" USING btree ("provider","eventId");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actorUserId");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("createdAt");