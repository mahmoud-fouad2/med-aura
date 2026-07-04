-- Travel & Concierge Requests module (Phase 3).
-- Two tables + two enums. Med Aura does NOT execute airline/hotel bookings —
-- these tables coordinate structured requests + offers so the concierge team
-- can track SLA and audit each response.

CREATE TYPE "travel_request_status" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'INFO_REQUESTED',
  'ASSIGNED',
  'OFFER_SENT',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'FULFILLED'
);
--> statement-breakpoint

CREATE TYPE "travel_offer_status" AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'WITHDRAWN'
);
--> statement-breakpoint

CREATE TABLE "travel_request" (
  "id" text PRIMARY KEY NOT NULL,
  "caseId" text NOT NULL REFERENCES "aesthetic_case"("id") ON DELETE CASCADE,
  "patientUserId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "originCountry" text NOT NULL,
  "originCity" text,
  "destinationCountry" text NOT NULL,
  "destinationCity" text,
  "arrivalDate" date,
  "departureDate" date,
  "travelers" integer NOT NULL DEFAULT 1,
  "needsAccommodation" boolean NOT NULL DEFAULT false,
  "needsAirportTransfer" boolean NOT NULL DEFAULT false,
  "needsInterpreter" boolean NOT NULL DEFAULT false,
  "interpreterLanguage" text,
  "specialRequirements" text,
  "status" "travel_request_status" NOT NULL DEFAULT 'SUBMITTED',
  "assignedConciergeId" text REFERENCES "user"("id") ON DELETE SET NULL,
  "slaDueAt" timestamp with time zone,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone,
  "createdBy" text,
  "updatedBy" text
);
--> statement-breakpoint

CREATE INDEX "travel_req_case_idx" ON "travel_request" ("caseId");
--> statement-breakpoint
CREATE INDEX "travel_req_status_idx" ON "travel_request" ("status");
--> statement-breakpoint
CREATE INDEX "travel_req_concierge_idx" ON "travel_request" ("assignedConciergeId");
--> statement-breakpoint

CREATE TABLE "travel_offer" (
  "id" text PRIMARY KEY NOT NULL,
  "requestId" text NOT NULL REFERENCES "travel_request"("id") ON DELETE CASCADE,
  "createdBy" text NOT NULL,
  "flightNotes" text,
  "hotelName" text,
  "hotelNotes" text,
  "transferNotes" text,
  "interpreterNotes" text,
  "totalAmount" numeric(12, 2),
  "currency" text NOT NULL DEFAULT 'SAR',
  "validUntil" timestamp with time zone,
  "attachmentKey" text,
  "status" "travel_offer_status" NOT NULL DEFAULT 'DRAFT',
  "sentAt" timestamp with time zone,
  "respondedAt" timestamp with time zone,
  "responseNote" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedBy" text
);
--> statement-breakpoint

CREATE INDEX "travel_offer_req_idx" ON "travel_offer" ("requestId");
--> statement-breakpoint
CREATE INDEX "travel_offer_status_idx" ON "travel_offer" ("status");
