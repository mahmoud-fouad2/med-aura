import { db, isDbConfigured } from "@/lib/db"
import { analyticsEvent } from "@/lib/db/schema"
import { logger } from "@/lib/logger"
import {
  sanitizeAnalyticsEvent,
  type AnalyticsEventInput,
} from "@/lib/analytics-events"

type TrackInput = AnalyticsEventInput & {
  anonymousId?: string
  userId?: string | null
}

/** Best-effort product telemetry. It never blocks the customer workflow. */
export async function trackAnalyticsEvent(input: TrackInput): Promise<void> {
  if (!isDbConfigured) return
  const event = sanitizeAnalyticsEvent(input)
  if (!event) return
  try {
    await db.insert(analyticsEvent).values({
      name: event.name,
      anonymousId: input.anonymousId ?? (input.userId ? `user:${input.userId}` : crypto.randomUUID()),
      userId: input.userId ?? null,
      locale: event.locale,
      path: event.path ?? null,
      properties: event.properties,
    })
  } catch (error) {
    logger.warn("analytics event write failed", {
      event: event.name,
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
  }
}
