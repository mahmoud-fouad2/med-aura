-- Video consultation sessions (lib/db/schema/video.ts).
-- NOTE: drizzle-kit generated this diff against a stale snapshot (0004) and
-- re-emitted objects that migrations 0006–0010 already created by hand; those
-- duplicates were removed. Only the video objects below are new. The 0011
-- snapshot captures the FULL current schema, so later diffs are clean again.
CREATE TYPE "public"."video_session_status" AS ENUM('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "video_session" (
	"id" text PRIMARY KEY NOT NULL,
	"appointmentId" text NOT NULL,
	"provider" text NOT NULL,
	"roomName" text NOT NULL,
	"providerRoomId" text,
	"roomUrl" text,
	"status" "video_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"scheduledStartAt" timestamp with time zone NOT NULL,
	"scheduledEndAt" timestamp with time zone NOT NULL,
	"joinAvailableFrom" timestamp with time zone NOT NULL,
	"joinAvailableUntil" timestamp with time zone NOT NULL,
	"startedAt" timestamp with time zone,
	"endedAt" timestamp with time zone,
	"patientJoinedAt" timestamp with time zone,
	"doctorJoinedAt" timestamp with time zone,
	"lastConnectionState" text,
	"createdById" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video_session_event" (
	"id" text PRIMARY KEY NOT NULL,
	"videoSessionId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"event" text NOT NULL,
	"deviceType" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_session" ADD CONSTRAINT "video_session_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session" ADD CONSTRAINT "video_session_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session_event" ADD CONSTRAINT "video_session_event_videoSessionId_video_session_id_fk" FOREIGN KEY ("videoSessionId") REFERENCES "public"."video_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_session_event" ADD CONSTRAINT "video_session_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "video_session_appointment_uq" ON "video_session" USING btree ("appointmentId");--> statement-breakpoint
CREATE UNIQUE INDEX "video_session_room_uq" ON "video_session" USING btree ("roomName");--> statement-breakpoint
CREATE INDEX "video_session_status_idx" ON "video_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_event_session_idx" ON "video_session_event" USING btree ("videoSessionId");
