CREATE TYPE "public"."before_after_media_kind" AS ENUM('BEFORE', 'AFTER');--> statement-breakpoint
CREATE TYPE "public"."before_after_status" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."travel_offer_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."travel_request_status" AS ENUM('DRAFT', 'SUBMITTED', 'INFO_REQUESTED', 'ASSIGNED', 'OFFER_SENT', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'FULFILLED');--> statement-breakpoint
CREATE TYPE "public"."video_session_status" AS ENUM('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "before_after_case" (
	"id" text PRIMARY KEY NOT NULL,
	"doctorId" text,
	"centerId" text,
	"procedureId" text NOT NULL,
	"sourceCaseId" text,
	"titleAr" text NOT NULL,
	"titleEn" text,
	"descriptionAr" text,
	"descriptionEn" text,
	"ageRange" text,
	"gender" text,
	"treatmentDate" date,
	"afterCaptureDays" integer,
	"consentGranted" boolean DEFAULT false NOT NULL,
	"consentGrantedAt" timestamp with time zone,
	"consentDocumentKey" text,
	"status" "before_after_status" DEFAULT 'DRAFT' NOT NULL,
	"rejectionReason" text,
	"publishedAt" timestamp with time zone,
	"reviewedBy" text,
	"reviewedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "before_after_media" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"kind" "before_after_media_kind" NOT NULL,
	"objectKey" text NOT NULL,
	"contentType" text NOT NULL,
	"sizeBytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"angle" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kind" text NOT NULL,
	"refId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_offer" (
	"id" text PRIMARY KEY NOT NULL,
	"requestId" text NOT NULL,
	"createdBy" text NOT NULL,
	"flightNotes" text,
	"hotelName" text,
	"hotelNotes" text,
	"transferNotes" text,
	"interpreterNotes" text,
	"totalAmount" numeric(12, 2),
	"currency" text DEFAULT 'SAR' NOT NULL,
	"validUntil" timestamp with time zone,
	"attachmentKey" text,
	"status" "travel_offer_status" DEFAULT 'DRAFT' NOT NULL,
	"sentAt" timestamp with time zone,
	"respondedAt" timestamp with time zone,
	"responseNote" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "travel_request" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"patientUserId" text NOT NULL,
	"originCountry" text NOT NULL,
	"originCity" text,
	"destinationCountry" text NOT NULL,
	"destinationCity" text,
	"arrivalDate" date,
	"departureDate" date,
	"travelers" integer DEFAULT 1 NOT NULL,
	"needsAccommodation" boolean DEFAULT false NOT NULL,
	"needsAirportTransfer" boolean DEFAULT false NOT NULL,
	"needsInterpreter" boolean DEFAULT false NOT NULL,
	"interpreterLanguage" text,
	"specialRequirements" text,
	"status" "travel_request_status" DEFAULT 'SUBMITTED' NOT NULL,
	"assignedConciergeId" text,
	"slaDueAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "video_session" (
	"id" text PRIMARY KEY NOT NULL,
	"appointmentId" text NOT NULL,
	"provider" text NOT NULL,
	"roomName" text NOT NULL,
	"providerRoomId" text,
	"roomUrl" text,
	"status" "video_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"scheduledStartAt" timestamp with time zone NOT NULL,
	"scheduledEndAt" timestamp with time zone NOT NULL,
	"joinAvailableFrom" timestamp with time zone NOT NULL,
	"joinAvailableUntil" timestamp with time zone NOT NULL,
	"startedAt" timestamp with time zone,
	"endedAt" timestamp with time zone,
	"patientJoinedAt" timestamp with time zone,
	"doctorJoinedAt" timestamp with time zone,
	"lastConnectionState" text,
	"createdById" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video_session_event" (
	"id" text PRIMARY KEY NOT NULL,
	"videoSessionId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"event" text NOT NULL,
	"deviceType" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "callingCode" text;--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "currencyCode" text;--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "defaultLanguage" text DEFAULT 'ar' NOT NULL;--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "archivedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "inAppEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "smsEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "whatsappEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "smsPhone" text;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "whatsappPhone" text;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "mutedEvents" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "before_after_case" ADD CONSTRAINT "before_after_case_doctorId_doctor_profile_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctor_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_case" ADD CONSTRAINT "before_after_case_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_case" ADD CONSTRAINT "before_after_case_procedureId_procedure_id_fk" FOREIGN KEY ("procedureId") REFERENCES "public"."procedure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_case" ADD CONSTRAINT "before_after_case_sourceCaseId_aesthetic_case_id_fk" FOREIGN KEY ("sourceCaseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "before_after_media" ADD CONSTRAINT "before_after_media_caseId_before_after_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."before_after_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_offer" ADD CONSTRAINT "travel_offer_requestId_travel_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."travel_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_request" ADD CONSTRAINT "travel_request_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_request" ADD CONSTRAINT "travel_request_patientUserId_user_id_fk" FOREIGN KEY ("patientUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_request" ADD CONSTRAINT "travel_request_assignedConciergeId_user_id_fk" FOREIGN KEY ("assignedConciergeId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session" ADD CONSTRAINT "video_session_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session" ADD CONSTRAINT "video_session_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session_event" ADD CONSTRAINT "video_session_event_videoSessionId_video_session_id_fk" FOREIGN KEY ("videoSessionId") REFERENCES "public"."video_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session_event" ADD CONSTRAINT "video_session_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ba_status_idx" ON "before_after_case" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ba_doctor_idx" ON "before_after_case" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "ba_center_idx" ON "before_after_case" USING btree ("centerId");--> statement-breakpoint
CREATE INDEX "ba_procedure_idx" ON "before_after_case" USING btree ("procedureId");--> statement-breakpoint
CREATE INDEX "ba_media_case_idx" ON "before_after_media" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "ba_media_kind_idx" ON "before_after_media" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_uniq" ON "favorite" USING btree ("userId","kind","refId");--> statement-breakpoint
CREATE INDEX "favorite_user_idx" ON "favorite" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "travel_offer_req_idx" ON "travel_offer" USING btree ("requestId");--> statement-breakpoint
CREATE INDEX "travel_offer_status_idx" ON "travel_offer" USING btree ("status");--> statement-breakpoint
CREATE INDEX "travel_req_case_idx" ON "travel_request" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "travel_req_status_idx" ON "travel_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "travel_req_concierge_idx" ON "travel_request" USING btree ("assignedConciergeId");--> statement-breakpoint
CREATE UNIQUE INDEX "video_session_appointment_uq" ON "video_session" USING btree ("appointmentId");--> statement-breakpoint
CREATE UNIQUE INDEX "video_session_room_uq" ON "video_session" USING btree ("roomName");--> statement-breakpoint
CREATE INDEX "video_session_status_idx" ON "video_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_event_session_idx" ON "video_session_event" USING btree ("videoSessionId");