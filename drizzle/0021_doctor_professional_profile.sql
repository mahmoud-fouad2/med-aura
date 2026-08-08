ALTER TABLE "doctor_profile" ADD COLUMN "qualifications" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD COLUMN "certifications" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD COLUMN "fellowships" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD COLUMN "memberships" text[] DEFAULT '{}' NOT NULL;