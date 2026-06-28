import { db } from "./db"
import { auditLog } from "./db/schema"
import { logger } from "./logger"

export type AuditInput = {
  action: string
  actorUserId?: string | null
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
  requestId?: string | null
}

/**
 * Append a row to the audit log. Best-effort: a logging failure must never
 * break the underlying business operation, so errors are swallowed + logged.
 * Pass a transaction (`tx`) to make the audit atomic with the action.
 */
export async function writeAudit(
  input: AuditInput,
  tx?: Pick<typeof db, "insert">,
): Promise<void> {
  try {
    const runner = tx ?? db
    await runner.insert(auditLog).values({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    })
  } catch (err) {
    logger.error("audit write failed", {
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Extract request metadata from Next headers when available (no-op in scripts). */
export async function requestMeta(): Promise<{
  ip: string | null
  userAgent: string | null
}> {
  try {
    const { headers } = await import("next/headers")
    const h = await headers()
    return {
      ip:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null,
      userAgent: h.get("user-agent"),
    }
  } catch {
    return { ip: null, userAgent: null }
  }
}
