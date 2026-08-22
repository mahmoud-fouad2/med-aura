ALTER TYPE "public"."appointment_status" ADD VALUE 'PAYMENT_EXPIRED' BEFORE 'CANCELLED_BY_PATIENT';--> statement-breakpoint
ALTER TYPE "public"."refund_status" ADD VALUE 'PROCESSING' BEFORE 'PROCESSED';--> statement-breakpoint
CREATE TABLE "analytics_event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"anonymousId" text NOT NULL,
	"userId" text,
	"locale" text DEFAULT 'ar' NOT NULL,
	"path" text,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "appointment_no_double_booking";--> statement-breakpoint
ALTER TABLE "center" ADD COLUMN "timezone" text DEFAULT 'Asia/Riyadh' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD COLUMN "timezone" text DEFAULT 'Asia/Riyadh' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment" ADD COLUMN "paymentExpiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "needsReconciliation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "reconciliationReason" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "reconciledAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "reconciledBy" text;--> statement-breakpoint
ALTER TABLE "payment_webhook_event" ADD COLUMN "processingAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_webhook_event" ADD COLUMN "attemptCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "refund_request" ADD COLUMN "processingStartedAt" timestamp with time zone;--> statement-breakpoint
UPDATE "center"
SET "timezone" = CASE
	WHEN upper(coalesce("country", '')) IN ('TR', 'TURKEY', 'TÜRKIYE', 'TÜRKİYE') THEN 'Europe/Istanbul'
	WHEN upper(coalesce("country", '')) IN ('AE', 'UAE', 'UNITED ARAB EMIRATES') THEN 'Asia/Dubai'
	WHEN upper(coalesce("country", '')) IN ('QA', 'QATAR') THEN 'Asia/Qatar'
	WHEN upper(coalesce("country", '')) IN ('KW', 'KUWAIT') THEN 'Asia/Kuwait'
	WHEN upper(coalesce("country", '')) IN ('BH', 'BAHRAIN') THEN 'Asia/Bahrain'
	ELSE 'Asia/Riyadh'
END;--> statement-breakpoint
UPDATE "doctor_profile" AS doctor
SET "timezone" = center."timezone"
FROM "center" AS center
WHERE doctor."centerId" = center."id";--> statement-breakpoint
UPDATE "appointment"
SET "paymentExpiresAt" = "createdAt" + interval '35 minutes'
WHERE "status" = 'PENDING_PAYMENT' AND "paymentExpiresAt" IS NULL;--> statement-breakpoint
INSERT INTO "patient_profile" (
	"id", "userId", "language", "createdAt", "updatedAt"
)
SELECT
	'pp_' || md5('patient-profile:' || app_user."id"),
	app_user."id",
	coalesce(nullif(app_user."locale", ''), 'ar'),
	now(),
	now()
FROM "user" AS app_user
WHERE app_user."role" = 'patient'
	AND NOT EXISTS (
		SELECT 1 FROM "patient_profile" profile WHERE profile."userId" = app_user."id"
	);--> statement-breakpoint
INSERT INTO "user_role" ("id", "userId", "roleId", "createdAt")
SELECT
	'ur_' || md5('primary-role:' || app_user."id" || ':' || primary_role."id"),
	app_user."id",
	primary_role."id",
	now()
FROM "user" AS app_user
JOIN "role" AS primary_role ON primary_role."key" = app_user."role"
WHERE NOT EXISTS (
		SELECT 1
		FROM "user_role" existing_role
		WHERE existing_role."userId" = app_user."id"
			AND existing_role."roleId" = primary_role."id"
			AND existing_role."centerId" IS NULL
	);--> statement-breakpoint
WITH ranked_reviews AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "patientUserId", "caseId"
			ORDER BY "createdAt" ASC, "id" ASC
		) AS position
	FROM "review"
	WHERE "caseId" IS NOT NULL
)
UPDATE "review" AS duplicate_review
SET
	"caseId" = NULL,
	"moderationStatus" = 'HIDDEN',
	"hiddenReason" = coalesce(
		duplicate_review."hiddenReason",
		'Duplicate legacy case review archived during reliability migration'
	),
	"updatedAt" = now()
FROM ranked_reviews
WHERE duplicate_review."id" = ranked_reviews."id"
	AND ranked_reviews.position > 1;--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_name_created_idx" ON "analytics_event" USING btree ("name","createdAt");--> statement-breakpoint
CREATE INDEX "analytics_anonymous_idx" ON "analytics_event" USING btree ("anonymousId","createdAt");--> statement-breakpoint
CREATE INDEX "analytics_user_idx" ON "analytics_event" USING btree ("userId","createdAt");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_reconciledBy_user_id_fk" FOREIGN KEY ("reconciledBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_payment_expiry_idx" ON "appointment" USING btree ("status","paymentExpiresAt");--> statement-breakpoint
CREATE INDEX "payment_reconciliation_idx" ON "payment" USING btree ("needsReconciliation","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "review_unique_case" ON "review" USING btree ("patientUserId","caseId") WHERE "review"."caseId" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_no_double_booking" ON "appointment" USING btree ("doctorId","startsAt") WHERE status IN ('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS','COMPLETED','RESCHEDULED');--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_time_order" CHECK ("appointment"."startsAt" < "appointment"."endsAt") NOT VALID;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_price_nonnegative" CHECK ("appointment"."priceAmount" is null or "appointment"."priceAmount" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_day_range" CHECK ("availability_rule"."dayOfWeek" between 0 and 6) NOT VALID;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_time_order" CHECK ("availability_rule"."startTime" < "availability_rule"."endTime") NOT VALID;--> statement-breakpoint
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_slot_range" CHECK ("availability_rule"."slotMinutes" between 5 and 480) NOT VALID;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_nonnegative" CHECK ("payment"."amount" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_amount_positive" CHECK ("refund_request"."amount" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_overall_range" CHECK ("review"."overallRating" between 1 and 5) NOT VALID;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_optional_ratings_range" CHECK (
        ("review"."doctorRating" is null or "review"."doctorRating" between 1 and 5) and
        ("review"."centerRating" is null or "review"."centerRating" between 1 and 5) and
        ("review"."communicationRating" is null or "review"."communicationRating" between 1 and 5) and
        ("review"."priceClarityRating" is null or "review"."priceClarityRating" between 1 and 5) and
        ("review"."followUpRating" is null or "review"."followUpRating" between 1 and 5)
      ) NOT VALID;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "medaura_provision_patient_user"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	patient_role_id text;
BEGIN
	IF NEW."role" <> 'patient' THEN
		RETURN NEW;
	END IF;

	SELECT "id" INTO patient_role_id
	FROM "role"
	WHERE "key" = 'patient'
	LIMIT 1;

	IF patient_role_id IS NULL THEN
		RAISE EXCEPTION 'Patient role is not configured';
	END IF;

	INSERT INTO "patient_profile" (
		"id", "userId", "language", "createdAt", "updatedAt"
	) VALUES (
		'pp_' || md5('patient-profile:' || NEW."id"),
		NEW."id",
		coalesce(nullif(NEW."locale", ''), 'ar'),
		now(),
		now()
	)
	ON CONFLICT ("userId") DO NOTHING;

	IF NOT EXISTS (
		SELECT 1
		FROM "user_role"
		WHERE "userId" = NEW."id"
			AND "roleId" = patient_role_id
			AND "centerId" IS NULL
	) THEN
		INSERT INTO "user_role" ("id", "userId", "roleId", "createdAt")
		VALUES (
			'ur_' || md5('patient-role:' || NEW."id"),
			NEW."id",
			patient_role_id,
			now()
		);
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "medaura_patient_user_provision" ON "user";--> statement-breakpoint
CREATE TRIGGER "medaura_patient_user_provision"
AFTER INSERT ON "user"
FOR EACH ROW
WHEN (NEW."role" = 'patient')
EXECUTE FUNCTION "medaura_provision_patient_user"();
