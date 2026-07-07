-- Extended reference fields on `country` for display purposes only (calling
-- code, currency code, default language, IANA timezone). These are
-- informational — they do NOT change how payment currency is resolved today
-- (every finance table keeps its own explicit "SAR" default; rewiring that is
-- a payments-domain decision, out of scope for a geography-catalog
-- migration). Nullable + safe defaults so existing rows never break.
--
-- No flag column: the flag emoji is derived at render time from `code` via
-- Unicode regional indicator symbols (lib/geo.ts) — a stored value would
-- just be a second, driftable copy of the same two letters.

ALTER TABLE "country" ADD COLUMN "callingCode" text;
--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "currencyCode" text;
--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "defaultLanguage" text DEFAULT 'ar' NOT NULL;
--> statement-breakpoint
ALTER TABLE "country" ADD COLUMN "timezone" text;
