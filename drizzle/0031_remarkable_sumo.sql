CREATE TYPE "public"."promo_discount_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TABLE "promo_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discountType" "promo_discount_type" NOT NULL,
	"discountValue" numeric(12, 2) NOT NULL,
	"currency" text,
	"maxRedemptions" integer,
	"redemptionCount" integer DEFAULT 0 NOT NULL,
	"maxRedemptionsPerUser" integer DEFAULT 1 NOT NULL,
	"minAmount" numeric(12, 2),
	"validFrom" timestamp with time zone,
	"validUntil" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "promo_code_code_unique" UNIQUE("code"),
	CONSTRAINT "promo_discount_value_positive" CHECK ("promo_code"."discountValue" > 0),
	CONSTRAINT "promo_percentage_range" CHECK ("promo_code"."discountType" <> 'PERCENTAGE' OR "promo_code"."discountValue" <= 100),
	CONSTRAINT "promo_max_redemptions_positive" CHECK ("promo_code"."maxRedemptions" is null or "promo_code"."maxRedemptions" > 0)
);
--> statement-breakpoint
CREATE TABLE "promo_code_redemption" (
	"id" text PRIMARY KEY NOT NULL,
	"promoCodeId" text NOT NULL,
	"userId" text NOT NULL,
	"appointmentId" text,
	"discountAmount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promo_code_redemption" ADD CONSTRAINT "promo_code_redemption_promoCodeId_promo_code_id_fk" FOREIGN KEY ("promoCodeId") REFERENCES "public"."promo_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemption" ADD CONSTRAINT "promo_code_redemption_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemption" ADD CONSTRAINT "promo_code_redemption_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "promo_code_idx" ON "promo_code" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promo_code_active_idx" ON "promo_code" USING btree ("active");--> statement-breakpoint
CREATE INDEX "promo_redemption_code_idx" ON "promo_code_redemption" USING btree ("promoCodeId");--> statement-breakpoint
CREATE INDEX "promo_redemption_user_idx" ON "promo_code_redemption" USING btree ("userId");