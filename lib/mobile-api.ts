import { NextResponse } from "next/server"
import { getCurrentUser, type SessionUser } from "@/lib/session"
import { absoluteUrl } from "@/lib/seo"

/**
 * Shared helpers for the native app's REST layer (app/api/mobile/v1/*).
 * Same session, RBAC, and data functions as the web — different transport.
 */

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

/** 401 payload the app translates into its sign-in redirect. */
export async function requireMobileUser(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      ok: false,
      response: jsonError("انتهت الجلسة. سجّل الدخول مرة أخرى.", 401),
    }
  }
  return { ok: true, user }
}

/** The app renders images by absolute URL; relative public paths won't load. */
export function absolutize(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return absoluteUrl(path)
}
