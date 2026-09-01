ALTER TABLE "referral_settings" DROP CONSTRAINT "referral_valid_days_positive";--> statement-breakpoint
ALTER TABLE "referral_settings" ADD CONSTRAINT "referral_currency_format" CHECK ("referral_settings"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "referral_settings" ADD CONSTRAINT "referral_valid_days_range" CHECK ("referral_settings"."rewardValidDays" between 1 and 3650);