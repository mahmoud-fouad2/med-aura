import { logger } from "./logger"

/**
 * Minimal monitoring adapter. Always logs structured errors; if
 * MONITORING_WEBHOOK_URL is set, forwards a sanitized payload (fire-and-forget).
 * Swap the webhook for Sentry/Datadog later without touching call sites.
 */
export function captureError(
  message: string,
  context: Record<string, unknown> = {},
): void {
  logger.error(message, context)
  const url = process.env.MONITORING_WEBHOOK_URL
  if (!url) return
  // Never include raw SQL or PII — callers pass codes/ids only.
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ...context, at: new Date().toISOString() }),
  }).catch(() => {})
}
