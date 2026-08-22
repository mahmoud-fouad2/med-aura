import { NextResponse } from "next/server"
import { consumeRateLimit } from "@/lib/rate-limit"
import { sanitizeAnalyticsEvent } from "@/lib/analytics-events"
import { trackAnalyticsEvent } from "@/lib/analytics"

export const dynamic = "force-dynamic"

const COOKIE_NAME = "medaura_anon"

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown"
  const limit = consumeRateLimit(`analytics:${ip}`, { limit: 120, windowMs: 60_000 })
  if (!limit.ok) return new NextResponse(null, { status: 429 })

  const event = sanitizeAnalyticsEvent(await request.json().catch(() => null))
  if (!event) return NextResponse.json({ error: "Invalid event" }, { status: 400 })

  const current = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === COOKIE_NAME)?.[1]
  const anonymousId = current && /^[a-f0-9-]{36}$/i.test(current)
    ? current
    : crypto.randomUUID()

  await trackAnalyticsEvent({ ...event, anonymousId })
  const response = new NextResponse(null, { status: 204 })
  if (!current) {
    response.cookies.set(COOKIE_NAME, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    })
  }
  return response
}
