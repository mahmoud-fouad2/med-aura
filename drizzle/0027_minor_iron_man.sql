ALTER TABLE "center" ADD CONSTRAINT "center_commission_rate_check" CHECK ("center"."platformCommissionRate" between 0 and 100);--> statement-breakpoint
ALTER TABLE "doctor_profile" ADD CONSTRAINT "doctor_commission_rate_check" CHECK ("doctor_profile"."platformCommissionRate" between 0 and 100);--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_commission_rate_check" CHECK ("invoice"."platformCommissionRate" between 0 and 100);--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_commission_amount_check" CHECK ("invoice"."platformCommissionAmount" >= 0);--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_provider_net_check" CHECK ("invoice"."providerNetAmount" >= 0);