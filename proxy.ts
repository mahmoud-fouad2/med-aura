import { NextRequest, NextResponse } from "next/server"

const MOBILE_WEB_DEV_ORIGIN = "http://localhost:8081"

function isLocalMobileWebRequest(request: NextRequest): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    request.headers.get("origin") === MOBILE_WEB_DEV_ORIGIN
  )
}

function applyCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", MOBILE_WEB_DEV_ORIGIN)
  response.headers.set("Access-Control-Allow-Credentials", "true")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
  response.headers.set("Vary", "Origin")
  return response
}

/**
 * Expo Web is a development surface only. Native Android/iOS requests do not
 * require CORS, but browser-based QA needs a valid preflight response for
 * mutation routes such as ticket creation and profile updates.
 */
export function proxy(request: NextRequest) {
  if (!isLocalMobileWebRequest(request)) return NextResponse.next()
  if (request.method === "OPTIONS") return applyCors(new NextResponse(null, { status: 204 }))
  return applyCors(NextResponse.next())
}

export const config = {
  matcher: ["/api/mobile/:path*"],
}