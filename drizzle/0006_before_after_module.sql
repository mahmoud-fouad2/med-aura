-- Before/After portfolio module.
-- Two tables + two enums. Consent-gated: moderation refuses to approve any
-- entry with consentGranted = false. Patient identity is never stored on
-- these rows (only doctor/center/procedure link + de-identified attributes
-- like age range and gender).

CREATE TYPE "before_after_status" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'ARCHIVED'
);
--> statement-breakpoint

CREATE TYPE "before_after_media_kind" AS ENUM (
  'BEFORE',
  'AFTER'
);
--> statement-breakpoint

CREATE TABLE "before_after_case" (
  "id" text PRIMARY KEY NOT NULL,
  "doctorId" text REFERENCES "doctor_profile"("id") ON DELETE SET NULL,
  "centerId" text REFERENCES "center"("id") ON DELETE SET NULL,
  "procedureId" text NOT NULL REFERENCES "procedure"("id") ON DELETE RESTRICT,
  "sourceCaseId" text REFERENCES "aesthetic_case"("id") ON DELETE SET NULL,
  "titleAr" text NOT NULL,
  "titleEn" text,
  "descriptionAr" text,
  "descriptionEn" text,
  "ageRange" text,
  "gender" text,
  "treatmentDate" date,
  "afterCaptureDays" integer,
  "consentGranted" boolean NOT NULL DEFAULT false,
  "consentGrantedAt" timestamp with time zone,
  "consentDocumentKey" text,
  "status" "before_after_status" NOT NULL DEFAULT 'DRAFT',
  "rejectionReason" text,
  "publishedAt" timestamp with time zone,
  "reviewedBy" text,
  "reviewedAt" timestamp with time zone,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone,
  "createdBy" text,
  "updatedBy" text
);
--> statement-breakpoint

CREATE INDEX "ba_status_idx" ON "before_after_case" ("status");
--> statement-breakpoint
CREATE INDEX "ba_doctor_idx" ON "before_after_case" ("doctorId");
--> statement-breakpoint
CREATE INDEX "ba_center_idx" ON "before_after_case" ("centerId");
--> statement-breakpoint
CREATE INDEX "ba_procedure_idx" ON "before_after_case" ("procedureId");
--> statement-breakpoint

CREATE TABLE "before_after_media" (
  "id" text PRIMARY KEY NOT NULL,
  "caseId" text NOT NULL REFERENCES "before_after_case"("id") ON DELETE CASCADE,
  "kind" "before_after_media_kind" NOT NULL,
  "objectKey" text NOT NULL,
  "contentType" text NOT NULL,
  "sizeBytes" integer NOT NULL DEFAULT 0,
  "width" integer,
  "height" integer,
  "angle" text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);
--> statement-breakpoint

CREATE INDEX "ba_media_case_idx" ON "before_after_media" ("caseId");
--> statement-breakpoint
CREATE INDEX "ba_media_kind_idx" ON "before_after_media" ("kind");
