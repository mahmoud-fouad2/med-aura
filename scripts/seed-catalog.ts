import "./_load-env"
import { pool } from "@/lib/db"
import { runSeed } from "./seed"

// Reference/catalog data only (roles, permissions, geography, procedures, FAQs).
// Safe to run in any environment, including production pre-deploy.
runSeed({ demo: false }).catch(async (err) => {
  console.error("Catalog seed failed:", err)
  try {
    await pool.end()
  } catch {}
  process.exit(1)
})
