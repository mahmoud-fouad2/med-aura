/**
 * Maps a notification's web-dashboard href to a native mobile route when one
 * exists, so tapping it opens the in-app screen instead of a browser tab.
 * Returns null when there's no native equivalent (e.g. the doctor/center
 * full dashboard, or a staff `/admin/tickets` triage link — admin tooling
 * stays web-only by design), meaning the caller should fall back to opening
 * the web page.
 */
export function resolveNativeNotificationRoute(href: string | null | undefined): string | null {
  if (!href) return null
  const caseMatch = href.match(/^\/dashboard\/cases\/([^/?]+)/)
  if (caseMatch) return `/case/${caseMatch[1]}`
  if (href === "/dashboard/appointments") return "/(tabs)/appointments"
  const ticketMatch = href.match(/^\/dashboard\/support\/([^/?]+)/)
  if (ticketMatch) return `/support/${ticketMatch[1]}`
  return null
}

export function notificationHref(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const value = typeof record.href === "string" ? record.href : record.url
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function resolveNotificationDestination(data: unknown): string {
  return resolveNativeNotificationRoute(notificationHref(data)) ?? "/notifications"
}
