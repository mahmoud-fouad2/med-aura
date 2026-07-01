import { NextResponse } from "next/server"
import { getMigrationStatus } from "@/lib/db/migration-status"

/**
 * Readiness probe. Returns 200 only when the database is configured, reachable,
 * and all migrations are applied; otherwise 503. The body reports booleans and
 * counts ONLY — never DATABASE_URL, SQL text, driver errors, or secret names —
 * so it is safe to expose to an orchestrator/health check.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const s = await getMigrationStatus()
  const ready = s.configured && s.connected && s.ready

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        databaseConfigured: s.configured,
        databaseConnected: s.connected,
        migrationsApplied: s.appliedCount,
        migrationsDefined: s.journalCount,
        migrationsPending: s.pending,
        schemaReady: s.ready,
      },
    },
    { status: ready ? 200 : 503 },
  )
}
