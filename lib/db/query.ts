import { randomUUID } from "node:crypto"
import { logger } from "@/lib/logger"
import { captureError } from "@/lib/monitoring"

/**
 * Unified data-read result. Distinguishes a successful (possibly empty) read
 * from a database that is unavailable (not configured / schema not migrated)
 * versus an unexpected error — so the UI never shows a DB failure as a
 * misleading "no results" empty state (C7 §1).
 */
export type QueryResult<T> =
  | { status: "ok"; data: T }
  | { status: "unavailable" }
  | { status: "error"; requestId: string }

/** Postgres SQLSTATEs that mean "schema isn't ready" → unavailable, not error. */
const SCHEMA_NOT_READY = new Set([
  "42P01", // undefined_table
  "3F000", // invalid_schema_name
  "42703", // undefined_column
  "42883", // undefined_function (enum/type missing)
  "57P03", // cannot_connect_now (db starting)
])

/**
 * Errors that mean "the connection is dead — try to reconnect": Neon
 * auto-suspend closes idle sockets, and Render's TCP keepalive on the way to
 * Neon will surface ETIMEDOUT / "Connection terminated" on the FIRST request
 * after a period of inactivity. On a fresh attempt, node-postgres opens a new
 * client and the query normally succeeds. We retry reads only.
 */
const TRANSIENT_CONN = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
])

function codeOf(err: unknown): string | undefined {
  if (err && typeof err === "object") {
    const e = err as { code?: string; cause?: { code?: string } }
    return e.code ?? e.cause?.code
  }
  return undefined
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function isTransientConnection(err: unknown): boolean {
  const code = codeOf(err)
  if (code && TRANSIENT_CONN.has(code)) return true
  const msg = messageOf(err).toLowerCase()
  return (
    msg.includes("connection terminated") ||
    msg.includes("client has encountered a connection error") ||
    msg.includes("timeout expired")
  )
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Run a read query and classify the outcome. Never throws.
 *
 * Retries transient connection failures (Neon auto-suspend / idle-socket close)
 * up to 2 additional times with bounded exponential backoff (150ms, 400ms).
 * NEVER used for mutations — server actions call drizzle directly so a lost
 * connection surfaces there as a real error (correct: we must not silently
 * re-run a payment / audit-log insert / status transition).
 */
export async function query<T>(fn: () => Promise<T>): Promise<QueryResult<T>> {
  // Read at call-time so a missing DB is classified as "unavailable", not error.
  if (!process.env.DATABASE_URL) return { status: "unavailable" }

  const delays = [150, 400] // 2 retries → 3 attempts total
  let lastErr: unknown

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return { status: "ok", data: await fn() }
    } catch (err) {
      lastErr = err
      const code = codeOf(err)
      if (code && SCHEMA_NOT_READY.has(code)) {
        logger.warn("db not ready (schema/connection)", { code })
        return { status: "unavailable" }
      }
      // Retry only transient connection errors, only if we have attempts left.
      if (isTransientConnection(err) && attempt < delays.length) {
        logger.warn("db read transient failure — retrying", {
          attempt: attempt + 1,
          code,
        })
        await sleep(delays[attempt])
        continue
      }
      break
    }
  }

  const requestId = randomUUID().slice(0, 8)
  captureError("db query failed", {
    requestId,
    code: codeOf(lastErr),
    message: messageOf(lastErr),
  })
  return { status: "error", requestId }
}

export function isEmptyData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0
  return data === null || data === undefined
}
