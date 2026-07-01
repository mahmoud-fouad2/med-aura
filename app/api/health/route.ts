import { NextResponse } from "next/server"

/**
 * Liveness probe. Proves the Node process is up and serving. Intentionally does
 * NOT touch the database or any secret — it must stay green even while the DB is
 * being migrated, so a load balancer keeps the instance in rotation.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const startedAt = Date.now()

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "med-aura",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  })
}
