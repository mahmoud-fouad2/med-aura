CREATE TABLE "contact_message" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"handledBy" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "faq" (
	"id" text PRIMARY KEY NOT NULL,
	"questionAr" text NOT NULL,
	"answerAr" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "contact_status_idx" ON "contact_message" USING btree ("status");--> statement-breakpoint
CREATE INDEX "faq_visible_idx" ON "faq" USING btree ("visible");