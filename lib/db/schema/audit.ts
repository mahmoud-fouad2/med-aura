import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"

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
