ALTER TABLE "procedure" ADD COLUMN "imageKey" text;--> statement-breakpoint
ALTER TABLE "procedure" ADD COLUMN "galleryKeys" text[] DEFAULT '{}' NOT NULL;