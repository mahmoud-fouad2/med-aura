/**
 * Next.js instrumentation — runs once when the server boots (not at build).
 * We validate core environment variables here so misconfiguration surfaces
 * immediately rather than as confusing runtime failures.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertCoreEnv } = await import("@/lib/env")
    assertCoreEnv()

    // Non-blocking readiness check: warn loudly if the schema is stale so the
    // operator sees it in logs at boot (does not prevent serving public pages).
    if (process.env.DATABASE_URL) {
      try {
        const { getMigrationStatus } = await import("@/lib/db/migration-status")
        const { logger } = await import("@/lib/logger")
        const s = await getMigrationStatus()
        if (!s.connected) {
          logger.error("[startup] database unreachable", { error: s.error })
        } else if (!s.ready) {
          logger.error(
            "[startup] database schema is NOT up to date — run `pnpm db:migrate`",
            { applied: s.appliedCount, defined: s.journalCount, pending: s.pending },
          )
        } else {
          logger.info("[startup] database ready", {
            migrations: s.appliedCount,
          })
        }
      } catch {
        // never block boot on the readiness probe
      }
    }
  }
}
