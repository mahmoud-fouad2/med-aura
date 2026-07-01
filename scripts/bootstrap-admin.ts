import "./_load-env"
import { eq, and } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user as userT, role as roleT, userRole } from "@/lib/db/schema"
import { ROLES } from "@/lib/rbac"
import { auth } from "@/lib/auth"

/**
 * Create (or promote) exactly one Super Admin from operator-supplied credentials.
 *
 * This is intentionally SEPARATE from scripts/seed-demo.ts: it is safe to run in
 * production (no fake accounts, no fixed password — the operator supplies real
 * credentials via env vars), and by default it only ever mints ONE admin so a
 * misconfigured re-run can't silently multiply admin accounts.
 *
 * Usage:
 *   BOOTSTRAP_ADMIN_EMAIL=you@example.com \
 *   BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' \
 *   [BOOTSTRAP_ADMIN_NAME='Your Name'] \
 *   [BOOTSTRAP_ADMIN_FORCE=true]   # allow minting an ADDITIONAL admin
 *   pnpm run db:bootstrap-admin
 */
async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "مدير النظام"
  const force = process.env.BOOTSTRAP_ADMIN_FORCE === "true"

  if (!email || !password) {
    console.error(
      "Missing BOOTSTRAP_ADMIN_EMAIL and/or BOOTSTRAP_ADMIN_PASSWORD. " +
        "Set both env vars and re-run. Nothing was created.",
    )
    process.exit(1)
  }
  if (password.length < 8) {
    console.error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.")
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.")
    process.exit(1)
  }

  const superAdminRole = (
    await db.select({ id: roleT.id }).from(roleT).where(eq(roleT.key, ROLES.SUPER_ADMIN)).limit(1)
  )[0]
  if (!superAdminRole) {
    console.error(
      "The super_admin role is not seeded yet. Run `pnpm run db:seed:catalog` first (it seeds roles/permissions).",
    )
    process.exit(1)
  }

  const existingByEmail = (
    await db.select().from(userT).where(eq(userT.email, email)).limit(1)
  )[0]

  if (!existingByEmail) {
    const anyAdmin = (
      await db.select({ id: userRole.id }).from(userRole).where(eq(userRole.roleId, superAdminRole.id)).limit(1)
    )[0]
    if (anyAdmin && !force) {
      console.error(
        "An admin account already exists. Refusing to create another silently.\n" +
          "Set BOOTSTRAP_ADMIN_FORCE=true to add an additional admin on purpose.",
      )
      process.exit(1)
    }
  }

  let userId: string
  if (existingByEmail) {
    userId = existingByEmail.id
    await db.update(userT).set({ role: ROLES.SUPER_ADMIN, emailVerified: true }).where(eq(userT.id, userId))
    console.log(`✓ existing user ${email} promoted to super_admin`)
  } else {
    await auth.api.signUpEmail({ body: { email, password, name } })
    const created = (
      await db.select().from(userT).where(eq(userT.email, email)).limit(1)
    )[0]
    if (!created) {
      console.error("Failed to create the user via Better Auth.")
      process.exit(1)
    }
    userId = created.id
    await db.update(userT).set({ role: ROLES.SUPER_ADMIN, emailVerified: true }).where(eq(userT.id, userId))
    console.log(`✓ created new user ${email}`)
  }

  const patientRole = (
    await db.select({ id: roleT.id }).from(roleT).where(eq(roleT.key, ROLES.PATIENT)).limit(1)
  )[0]
  if (patientRole) {
    await db.delete(userRole).where(and(eq(userRole.userId, userId), eq(userRole.roleId, patientRole.id)))
  }
  await db.insert(userRole).values({ userId, roleId: superAdminRole.id }).onConflictDoNothing()

  console.log(`✅ ${email} now has the super_admin role. Sign in at /sign-in.`)
  await pool.end()
}

main().catch(async (err) => {
  console.error("bootstrap-admin failed:", err)
  try {
    await pool.end()
  } catch {}
  process.exit(1)
})
