import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { unauthorized, forbidden } from "@/lib/errors"
import {
  getUserRoles,
  hasPermission,
  type RoleKey,
  type PermissionKey,
} from "@/lib/rbac"

export type SessionUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  role: string
  status?: string
  locale?: string
}

export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch (err) {
    // Without a reachable database (e.g. local preview) treat as signed-out
    // rather than crashing every page that renders the header.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[auth] getSession failed, treating as anonymous:",
        err instanceof Error ? err.message : String(err),
      )
    }
    return null
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession()
  return (session?.user as SessionUser | undefined) ?? null
}

/** For server actions / route handlers: throw if not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw unauthorized()
  return user
}

export async function getUserId(): Promise<string> {
  return (await requireUser()).id
}

/** For server components: redirect to sign-in (with return path) if anonymous. */
export async function requireAuthPage(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect(
      returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in",
    )
  }
  return user
}

/** Throw FORBIDDEN unless the current user holds the permission. */
export async function requirePermissionOrThrow(
  perm: PermissionKey,
): Promise<SessionUser> {
  const user = await requireUser()
  if (!(await hasPermission(user.id, perm))) throw forbidden()
  return user
}

/** For server components: gate a page on a permission, redirecting to /403. */
export async function requirePermissionPage(
  perm: PermissionKey,
): Promise<SessionUser> {
  const user = await requireAuthPage()
  if (!(await hasPermission(user.id, perm))) redirect("/403")
  return user
}

export async function currentUserRoles(): Promise<RoleKey[]> {
  const user = await getCurrentUser()
  if (!user) return []
  return getUserRoles(user.id)
}
