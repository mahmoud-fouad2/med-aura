ALTER TABLE "contact_message" ADD COLUMN "repliedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_message" ADD COLUMN "repliedBy" text;