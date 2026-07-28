ALTER TABLE "conversation" ADD COLUMN "status" text DEFAULT 'OPEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "category" text;--> statement-breakpoint
CREATE INDEX "conversation_status_idx" ON "conversation" USING btree ("status");