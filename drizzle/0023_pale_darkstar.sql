CREATE TABLE "qa_video_join_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"ticketHash" text NOT NULL,
	"roomName" text NOT NULL,
	"roomUrl" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"consumedAt" timestamp with time zone,
	"createdById" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qa_video_join_ticket" ADD CONSTRAINT "qa_video_join_ticket_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_video_join_ticket" ADD CONSTRAINT "qa_video_join_ticket_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qa_video_ticket_hash_uq" ON "qa_video_join_ticket" USING btree ("ticketHash");--> statement-breakpoint
CREATE INDEX "qa_video_ticket_room_idx" ON "qa_video_join_ticket" USING btree ("roomName");--> statement-breakpoint
CREATE INDEX "qa_video_ticket_user_idx" ON "qa_video_join_ticket" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "qa_video_ticket_expiry_idx" ON "qa_video_join_ticket" USING btree ("expiresAt");