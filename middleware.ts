import { NextRequest, NextResponse } from "next/server"
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config"

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
 * Standard Next.js middleware.
 * Handles:
 * 1. Mobile Web CORS in local development.
 * 2. Locale prefix rewrites (/(ar|en)/...) and setting the locale cookie.
 */
export function middleware(request: NextRequest) {
  if (isLocalMobileWebRequest(request)) {
    if (request.method === "OPTIONS") {
      return applyCors(new NextResponse(null, { status: 204 }))
    }
    return applyCors(NextResponse.next())
  }

  const [, locale, rest = ""] = request.nextUrl.pathname.match(
    /^\/(ar|en)(\/.*)?$/,
  ) ?? []
  if (!isLocale(locale)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = rest || "/"
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-medaura-locale", locale)
  const response = NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  })
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  return response
}

export const config = {
  matcher: [
    "/api/mobile/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\..*).*)",
  ],
}
