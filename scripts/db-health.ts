import "./_load-env"
import { Pool } from "pg"

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.")
    process.exit(1)
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const res = await pool.query("SELECT version()")
    console.log("Database OK:", res.rows[0].version)
  } catch (err) {
    console.error("Database unreachable:", err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
