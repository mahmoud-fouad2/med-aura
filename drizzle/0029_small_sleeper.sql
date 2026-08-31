ALTER TABLE "patient_profile" ADD COLUMN "biologicalSex" text;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD COLUMN "heightCm" integer;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD COLUMN "weightKg" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_biological_sex_check" CHECK ("patient_profile"."biologicalSex" in ('male', 'female'));--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_height_check" CHECK ("patient_profile"."heightCm" between 30 and 280);--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_weight_check" CHECK ("patient_profile"."weightKg" between 1 and 500);