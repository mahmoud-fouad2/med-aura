/**
 * Maps a notification's web-dashboard href to a native mobile route when one
 * exists, so tapping it opens the in-app screen instead of a browser tab.
 * Returns null when there's no native equivalent yet (e.g. the doctor/center
 * full dashboard, or support tickets — the native ticket screen doesn't
 * exist yet), meaning the caller should fall back to opening the web page.
 */
export function resolveNativeNotificationRoute(href: string | null | undefined): string | null {
  if (!href) return null
  const caseMatch = href.match(/^\/dashboard\/cases\/([^/?]+)/)
  if (caseMatch) return `/case/${caseMatch[1]}`
  if (href === "/dashboard/appointments") return "/(tabs)/appointments"
  return null
}
