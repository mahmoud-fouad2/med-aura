CREATE TYPE "public"."internal_task_status" AS ENUM('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROVIDER_CONFIRMED', 'PROCESSED', 'FAILED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."follow_up_task_status" ADD VALUE 'SUBMITTED' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."follow_up_task_status" ADD VALUE 'UNDER_REVIEW' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."notification_delivery_status" ADD VALUE 'OPTED_OUT';--> statement-breakpoint
ALTER TYPE "public"."safety_alert_status" ADD VALUE 'PROVIDER_REVIEWED' BEFORE 'RESOLVED';--> statement-breakpoint
ALTER TYPE "public"."safety_alert_status" ADD VALUE 'FALSE_ALARM';--> statement-breakpoint
CREATE TABLE "center_staff" (
	"id" text PRIMARY KEY NOT NULL,
	"centerId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_closure" (
	"id" text PRIMARY KEY NOT NULL,
	"caseId" text NOT NULL,
	"closedBy" text NOT NULL,
	"closedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"reopenedBy" text,
	"reopenedAt" timestamp with time zone,
	"reopenReason" text
);
--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"userId" text PRIMARY KEY NOT NULL,
	"emailEnabled" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_request" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"paymentId" text,
	"caseId" text NOT NULL,
	"requestedByUserId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'REQUESTED' NOT NULL,
	"reviewedBy" text,
	"reviewedAt" timestamp with time zone,
	"reviewNotes" text,
	"providerConfirmedBy" text,
	"providerConfirmedAt" timestamp with time zone,
	"creditNoteId" text,
	"providerRefundId" text,
	"processedAt" timestamp with time zone,
	"failureReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdBy" text,
	"updatedBy" text
);
--> statement-breakpoint
ALTER TABLE "follow_up_task" ADD COLUMN "submittedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "follow_up_task" ADD COLUMN "reviewedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "follow_up_task" ADD COLUMN "reviewedBy" text;--> statement-breakpoint
ALTER TABLE "follow_up_task" ADD COLUMN "reviewNotes" text;--> statement-breakpoint
ALTER TABLE "internal_task" ADD COLUMN "status" "internal_task_status" DEFAULT 'OPEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD COLUMN "resolvedBy" text;--> statement-breakpoint
ALTER TABLE "safety_alert" ADD COLUMN "resolutionNotes" text;--> statement-breakpoint
ALTER TABLE "center_staff" ADD CONSTRAINT "center_staff_centerId_center_id_fk" FOREIGN KEY ("centerId") REFERENCES "public"."center"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "center_staff" ADD CONSTRAINT "center_staff_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_closure" ADD CONSTRAINT "case_closure_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_invoiceId_invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_paymentId_payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_caseId_aesthetic_case_id_fk" FOREIGN KEY ("caseId") REFERENCES "public"."aesthetic_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_requestedByUserId_user_id_fk" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_creditNoteId_credit_note_id_fk" FOREIGN KEY ("creditNoteId") REFERENCES "public"."credit_note"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "center_staff_unique" ON "center_staff" USING btree ("centerId","userId");--> statement-breakpoint
CREATE INDEX "center_staff_user_idx" ON "center_staff" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "case_closure_case_idx" ON "case_closure" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "refund_invoice_idx" ON "refund_request" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "refund_case_idx" ON "refund_request" USING btree ("caseId");--> statement-breakpoint
CREATE INDEX "refund_status_idx" ON "refund_request" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_provider_refund_idx" ON "refund_request" USING btree ("providerRefundId");--> statement-breakpoint
CREATE INDEX "internal_task_status_idx" ON "internal_task" USING btree ("status");