import "./_load-env"
import { getMigrationStatus } from "@/lib/db/migration-status"
import { pool } from "@/lib/db"

/**
 * Deployment readiness check. Fails (non-zero exit) if the database is not
 * configured, unreachable, has pending migrations, or if demo data would run in
 * production. Run in CI / pre-deploy: `pnpm db:status`.
 */
async function main() {
  let exitCode = 0
  const s = await getMigrationStatus()

  if (!s.configured) {
    console.error("✗ DATABASE_URL is not set.")
    process.exit(1)
  }
  if (!s.connected) {
    console.error("✗ Cannot connect to the database:", s.error)
    process.exit(1)
  }

  console.log(
    `migrations: applied ${s.appliedCount} / ${s.journalCount} defined, pending ${s.pending}`,
  )

  // Production safety: demo data must never be enabled in production.
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO_DATA === "true") {
    console.error("✗ ENABLE_DEMO_DATA=true is not allowed in production.")
    exitCode = 1
  }

  if (!s.ready) {
    console.error(
      s.journalCount === 0
        ? "✗ No migrations found in drizzle/. Run `pnpm db:generate` first."
        : "✗ Database is NOT up to date. Run `pnpm db:migrate`.",
    )
    exitCode = 1
  } else {
    console.log("✓ Database is ready (all migrations applied).")
  }

  await pool.end()
  process.exit(exitCode)
}

main().catch(async (err) => {
  console.error("check-database failed:", err)
  try {
    await pool.end()
  } catch {}
  process.exit(1)
})
