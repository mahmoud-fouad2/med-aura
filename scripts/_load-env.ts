import { config } from "dotenv"
import { existsSync } from "node:fs"

// Load env for CLI scripts: prefer .env.local, then .env.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) config({ path: file })
}
