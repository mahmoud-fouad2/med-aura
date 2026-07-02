ALTER TABLE "safety_alert" ADD COLUMN "assignedTo" text;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD COLUMN "createdBy" text;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD COLUMN "updatedBy" text;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD CONSTRAINT "safety_alert_assignedTo_user_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "safety_assignee_idx" ON "safety_alert" USING btree ("assignedTo");