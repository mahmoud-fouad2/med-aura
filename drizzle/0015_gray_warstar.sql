ALTER TABLE "payment" ADD COLUMN "manualMethod" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "manualReferenceNote" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "manualRecordedById" text;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_manualRecordedById_user_id_fk" FOREIGN KEY ("manualRecordedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;