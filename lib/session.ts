import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export type AppRole = "patient" | "provider" | "admin"

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getUserId(): Promise<string> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function requireRole(role: AppRole) {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const userRole = (session.user as { role?: string }).role ?? "patient"
  if (userRole !== role && userRole !== "admin") {
    throw new Error("Forbidden")
  }
  return session.user
}
