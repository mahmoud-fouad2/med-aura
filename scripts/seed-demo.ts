import "./_load-env"
import { pool } from "@/lib/db"
import { runSeed } from "./seed"

// Reference/catalog data + demo accounts and providers.
// runSeed refuses to run when NODE_ENV=production.
runSeed({ demo: true }).catch(async (err) => {
  console.error("Demo seed failed:", err)
  try {
    await pool.end()
  } catch {}
  process.exit(1)
})
