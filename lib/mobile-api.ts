import { NextResponse } from "next/server"
import { getCurrentUser, type SessionUser } from "@/lib/session"
import { absoluteUrl } from "@/lib/seo"
import { logger } from "@/lib/logger"

/**
 * Shared helpers for the native app's REST layer (app/api/mobile/v1/*).
 * Same session, RBAC, and data functions as the web — different transport.
 */

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(
    { ok: false, error: message, ...(code ? { code } : {}) },
    { status },
  )
}

/**
 * An unexpected server-side failure: log it, then tell the app the same
 * generic thing every other route does.
 *
 * Every route here used to write `catch { return jsonError("تعذر تحميل
 * البيانات…", 500) }` — the user saw "couldn't load, try again" and the
 * server recorded nothing at all, so a screen that fails only for certain
 * users or certain rows was impossible to diagnose from production. The
 * message the app shows is unchanged; what changes is that the cause now
 * reaches the logs, tagged with which route produced it.
 *
 * `scope` identifies the route, e.g. "mobile.tickets". Never pass user data —
 * the log line is the error and the route name, nothing else. `message`
 * overrides the default for routes that write rather than read (booking,
 * video, push registration), whose wording must stay specific to the action
 * the user just attempted.
 */
export function jsonServerError(scope: string, err: unknown, message?: string) {
  logger.error(`${scope} failed`, {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  return jsonError(message ?? "تعذر تحميل البيانات. حاول مرة أخرى.", 500)
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
