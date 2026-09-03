/**
 * Accept an app-internal destination while rejecting protocol-relative URLs,
 * backslashes, control characters, and absolute external URLs.
 */
export function safeRelativePath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback

  try {
    const base = "https://medaura.internal"
    const parsed = new URL(value, base)
    if (parsed.origin !== base) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
