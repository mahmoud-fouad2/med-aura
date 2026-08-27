ALTER TABLE "invoice" ADD COLUMN "platformCommissionRate" numeric(5, 2) DEFAULT '15.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "platformCommissionAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "providerNetAmount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
UPDATE "invoice"
SET
  "platformCommissionAmount" = round("subtotal" * "platformCommissionRate" / 100, 2),
  "providerNetAmount" = greatest("total" - round("subtotal" * "platformCommissionRate" / 100, 2), 0);
