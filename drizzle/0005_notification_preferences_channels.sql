-- Extend the notification_preference table with per-channel toggles for the
-- four supported channels (IN_APP / EMAIL / SMS / WHATSAPP), plus optional
-- channel-specific phone number overrides and a muted-events allowlist.
--
-- Existing rows get sensible defaults matching the previous behaviour
-- (in-app + email on; SMS + WhatsApp off).

ALTER TABLE "notification_preference"
  ADD COLUMN IF NOT EXISTS "inAppEnabled" boolean NOT NULL DEFAULT true;
--> statement-breakpoint

ALTER TABLE "notification_preference"
  ADD COLUMN IF NOT EXISTS "smsEnabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE "notification_preference"
  ADD COLUMN IF NOT EXISTS "whatsappEnabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE "notification_preference"
  ADD COLUMN IF NOT EXISTS "smsPhone" text;
--> statement-breakpoint

ALTER TABLE "notification_preference"
  ADD COLUMN IF NOT EXISTS "whatsappPhone" text;
--> statement-breakpoint

ALTER TABLE "notification_preference"
  ADD COLUMN IF NOT EXISTS "mutedEvents" text[] NOT NULL DEFAULT ARRAY[]::text[];
