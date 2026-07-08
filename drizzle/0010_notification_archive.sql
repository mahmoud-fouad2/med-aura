-- Lets a user archive a notification out of their inbox without losing it —
-- hard-deleting would orphan its notification_delivery rows (FK, cascade),
-- destroying the send/read history for no benefit. Nullable timestamp: null
-- = active (default, matches all existing rows), set = archived.

ALTER TABLE "notification" ADD COLUMN "archivedAt" timestamp with time zone;
