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

function codeOf(err: unknown): string | undefined {
  if (err && typeof err === "object") {
    const e = err as { code?: string; cause?: { code?: string } }
    return e.code ?? e.cause?.code
  }
  return undefined
}

/**
 * Run a read query and classify the outcome. Never throws. Logs unexpected
 * errors with a short requestId; never leaks SQL or table names to callers.
 */
export async function query<T>(fn: () => Promise<T>): Promise<QueryResult<T>> {
  // Read at call-time so a missing DB is classified as "unavailable", not error.
  if (!process.env.DATABASE_URL) return { status: "unavailable" }
  try {
    return { status: "ok", data: await fn() }
  } catch (err) {
    const code = codeOf(err)
    if (code && SCHEMA_NOT_READY.has(code)) {
      logger.warn("db not ready (schema/connection)", { code })
      return { status: "unavailable" }
    }
    const requestId = randomUUID().slice(0, 8)
    captureError("db query failed", {
      requestId,
      code,
      message: err instanceof Error ? err.message : String(err),
    })
    return { status: "error", requestId }
  }
}

export function isEmptyData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0
  return data === null || data === undefined
}
