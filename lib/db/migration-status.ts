import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { pool } from "./index"

export type MigrationStatus = {
  configured: boolean
  connected: boolean
  /** migrations defined in drizzle/meta/_journal.json */
  journalCount: number
  /** migrations recorded as applied in the database */
  appliedCount: number
  pending: number
  ready: boolean
  error?: string
}

function readJournalCount(): number {
  try {
    const p = path.join(process.cwd(), "drizzle", "meta", "_journal.json")
    if (!existsSync(p)) return 0
    const j = JSON.parse(readFileSync(p, "utf8")) as { entries?: unknown[] }
    return Array.isArray(j.entries) ? j.entries.length : 0
  } catch {
    return 0
  }
}

/**
 * Inspect migration readiness without throwing. Compares the migrations defined
 * in the repo (journal) against those recorded as applied in the database
 * (drizzle.__drizzle_migrations). Used by `pnpm db:status` and the admin
 * system-health page so a stale schema is surfaced, never hidden.
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
  const journalCount = readJournalCount()
  if (!process.env.DATABASE_URL) {
    return { configured: false, connected: false, journalCount, appliedCount: 0, pending: journalCount, ready: false }
  }
  try {
    await pool.query("SELECT 1")
  } catch (err) {
    return {
      configured: true,
      connected: false,
      journalCount,
      appliedCount: 0,
      pending: journalCount,
      ready: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
  let appliedCount = 0
  try {
    const res = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM drizzle."__drizzle_migrations"',
    )
    appliedCount = res.rows[0]?.n ?? 0
  } catch {
    // migrations table doesn't exist yet → nothing applied
    appliedCount = 0
  }
  const pending = Math.max(0, journalCount - appliedCount)
  return {
    configured: true,
    connected: true,
    journalCount,
    appliedCount,
    pending,
    ready: journalCount > 0 && pending === 0,
  }
}
