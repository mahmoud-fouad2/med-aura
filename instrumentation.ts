/**
 * Next.js instrumentation — runs once when the server boots (not at build).
 * We validate core environment variables here so misconfiguration surfaces
 * immediately rather than as confusing runtime failures.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertCoreEnv } = await import("@/lib/env")
    assertCoreEnv()

    // Apply pending migrations at boot. The hosting free tier has no
    // Pre-Deploy Command, so server startup is the only hook guaranteed to
    // run on every deploy. Idempotent — drizzle tracks applied entries and
    // an up-to-date schema costs one lookup — and effectively race-free on
    // a single-instance plan.
    if (process.env.DATABASE_URL) {
      const { logger } = await import("@/lib/logger")
      try {
        const { drizzle } = await import("drizzle-orm/node-postgres")
        const { migrate } = await import("drizzle-orm/node-postgres/migrator")
        const { Pool } = await import("pg")
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 1,
        })
        try {
          await migrate(drizzle(pool), { migrationsFolder: "./drizzle" })
          logger.info("[startup] database migrations up to date")
        } finally {
          await pool.end()
        }
      } catch (err) {
        const errorCode =
          err && typeof err === "object" && "code" in err && typeof err.code === "string"
            ? err.code
            : undefined
        logger.error("[startup] migration failed — schema may be stale", {
          errorName: err instanceof Error ? err.name : "UnknownError",
          ...(errorCode ? { errorCode } : {}),
        })
        // Serving a new release against a stale schema is more dangerous than
        // failing the deployment. Development remains available for local
        // diagnosis, while production fails closed without logging secrets.
        if (process.env.NODE_ENV === "production") {
          throw new Error("Database migration failed during startup.")
        }
      }
    }
  }
}
