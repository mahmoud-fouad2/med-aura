import {
  pgTable,
  text,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { lifecycle, paymentStatusEnum, paymentPurposeEnum } from "./_shared"
import { user } from "./auth"
import { appointment } from "./scheduling"
import { aestheticCase } from "./cases"

export const payment = pgTable(
  "payment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reference: text("reference").notNull().unique(),
    purpose: paymentPurposeEnum("purpose").notNull(),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("SAR"),
    payerUserId: text("payerUserId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    appointmentId: text("appointmentId").references(() => appointment.id, {
      onDelete: "set null",
    }),
    caseId: text("caseId").references(() => aestheticCase.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("stripe"),
    providerIntentId: text("providerIntentId"),
    providerSessionId: text("providerSessionId"),
    failureReason: text("failureReason"),
    paidAt: timestamp("paidAt", { withTimezone: true }),
    ...lifecycle(),
  },
  (t) => [
    index("payment_payer_idx").on(t.payerUserId),
    index("payment_appointment_idx").on(t.appointmentId),
    index("payment_status_idx").on(t.status),
    uniqueIndex("payment_intent_idx").on(t.providerIntentId),
  ],
)

/**
 * Raw provider webhook events, stored to guarantee idempotency: the unique
 * (provider, eventId) means a re-delivered webhook is recognised and skipped
 * instead of double-applying (section 23).
 */
export const paymentWebhookEvent = pgTable(
  "payment_webhook_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(),
    eventId: text("eventId").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processedAt", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("webhook_event_unique").on(t.provider, t.eventId)],
)
