CREATE TYPE "public"."referral_reward_type" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "referral" (
	"id" text PRIMARY KEY NOT NULL,
	"referrerUserId" text NOT NULL,
	"refereeUserId" text NOT NULL,
	"status" "referral_status" DEFAULT 'PENDING' NOT NULL,
	"qualifyingAppointmentId" text,
	"referrerRewardPromoCodeId" text,
	"refereeRewardPromoCodeId" text,
	"qualifiedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"referrerRewardType" "referral_reward_type" DEFAULT 'FIXED' NOT NULL,
	"referrerRewardValue" numeric(12, 2) DEFAULT '50.00' NOT NULL,
	"refereeRewardType" "referral_reward_type" DEFAULT 'FIXED' NOT NULL,
	"refereeRewardValue" numeric(12, 2) DEFAULT '50.00' NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"rewardValidDays" integer DEFAULT 90 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text,
	CONSTRAINT "referral_referrer_value_positive" CHECK ("referral_settings"."referrerRewardValue" > 0),
	CONSTRAINT "referral_referee_value_positive" CHECK ("referral_settings"."refereeRewardValue" > 0),
	CONSTRAINT "referral_referrer_percentage_range" CHECK ("referral_settings"."referrerRewardType" <> 'PERCENTAGE' OR "referral_settings"."referrerRewardValue" <= 100),
	CONSTRAINT "referral_referee_percentage_range" CHECK ("referral_settings"."refereeRewardType" <> 'PERCENTAGE' OR "referral_settings"."refereeRewardValue" <= 100),
	CONSTRAINT "referral_valid_days_positive" CHECK ("referral_settings"."rewardValidDays" > 0)
);
--> statement-breakpoint
ALTER TABLE "patient_profile" ADD COLUMN "referralCode" text;--> statement-breakpoint
ALTER TABLE "promo_code" ADD COLUMN "restrictedToUserId" text;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrerUserId_user_id_fk" FOREIGN KEY ("referrerUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_refereeUserId_user_id_fk" FOREIGN KEY ("refereeUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrerRewardPromoCodeId_promo_code_id_fk" FOREIGN KEY ("referrerRewardPromoCodeId") REFERENCES "public"."promo_code"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_refereeRewardPromoCodeId_promo_code_id_fk" FOREIGN KEY ("refereeRewardPromoCodeId") REFERENCES "public"."promo_code"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_referee_unique" ON "referral" USING btree ("refereeUserId");--> statement-breakpoint
CREATE INDEX "referral_referrer_idx" ON "referral" USING btree ("referrerUserId");--> statement-breakpoint
CREATE INDEX "referral_status_idx" ON "referral" USING btree ("status");--> statement-breakpoint
ALTER TABLE "promo_code" ADD CONSTRAINT "promo_code_restrictedToUserId_user_id_fk" FOREIGN KEY ("restrictedToUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_profile_referralCode_unique" UNIQUE("referralCode");