// output: "standalone" traces each route's actual import graph into
// .next/standalone — it does NOT include anything reached only via a
// runtime, non-static path. Three things in this app need copying in by
// hand:
//   - public/            served directly by the standalone server
//   - .next/static/       client JS/CSS chunks (not traced — a known,
//                          documented standalone-mode requirement)
//   - drizzle/             read at boot by instrumentation.ts's migration
//                          runner via drizzle-orm's migrationsFolder path,
//                          a process.cwd()-relative read the tracer can't see
import { cpSync, existsSync, mkdirSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const standaloneRoot = path.join(root, ".next", "standalone")

if (!existsSync(standaloneRoot)) {
  console.error("[prepare-standalone] .next/standalone not found — is next.config.mjs's output: \"standalone\" set?")
  process.exit(1)
}

function copy(rel) {
  const src = path.join(root, rel)
  const dest = path.join(standaloneRoot, rel)
  if (!existsSync(src)) {
    console.warn(`[prepare-standalone] skipping missing ${rel}`)
    return
  }
  mkdirSync(path.dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log(`[prepare-standalone] copied ${rel}`)
}

copy("public")
copy(path.join(".next", "static"))
copy("drizzle")
