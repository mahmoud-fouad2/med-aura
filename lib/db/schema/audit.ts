import { pgTable, text, jsonb, timestamp, index, integer } from "drizzle-orm/pg-core"
import { user } from "./auth"

/**
 * Append-only audit log for sensitive actions (section 43): logins, role and
 * permission changes, provider approvals, medical-file views/downloads, consent
 * grant/revoke, payment status changes, refunds, moderation, data export, etc.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorUserId: text("actorUserId"),
    action: text("action").notNull(), // e.g. "medical_document.view"
    entityType: text("entityType"),
    entityId: text("entityId"),
    ip: text("ip"),
    userAgent: text("userAgent"),
    requestId: text("requestId"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorUserId),
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_created_idx").on(t.createdAt),
  ],
)

/**
 * First-party, privacy-minimized product events. Event names and properties are
 * allowlisted at the API boundary; medical text, names, email and phone are
 * never accepted here.
 */
export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    anonymousId: text("anonymousId").notNull(),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    locale: text("locale").notNull().default("ar"),
    path: text("path"),
    properties: jsonb("properties").notNull().default({}),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("analytics_name_created_idx").on(t.name, t.createdAt),
    index("analytics_anonymous_idx").on(t.anonymousId, t.createdAt),
    index("analytics_user_idx").on(t.userId, t.createdAt),
  ],
)

/** Shared fixed-window counters for costly/public endpoints across all instances. */
export const apiRateLimit = pgTable("api_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("resetAt", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})
