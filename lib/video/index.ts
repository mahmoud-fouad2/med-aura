import { env, isProd } from "@/lib/env"
import type { VideoProvider } from "./provider"
import { DailyProvider } from "./providers/daily"
import { MockProvider } from "./providers/mock"

export type { ParticipantToken, VideoProvider, VideoRole, VideoRoom } from "./provider"
export { VideoProviderError } from "./provider"

let cached: VideoProvider | null | undefined

/**
 * The active provider, or null when video consultations are disabled. Null is
 * a first-class state: every surface shows "غير مفعّل" instead of a join
 * button that can't work. The mock provider is never served in production.
 */
export function getVideoProvider(): VideoProvider | null {
  if (cached !== undefined) return cached
  const id = env.VIDEO_PROVIDER
  if (id === "mock" && !isProd()) {
    cached = new MockProvider()
  } else if (id === "daily" && env.VIDEO_PROVIDER_API_KEY) {
    cached = new DailyProvider(env.VIDEO_PROVIDER_API_KEY)
  } else {
    cached = null
  }
  return cached
}

/** Test seam — swap the provider without touching the environment. */
export function setVideoProviderForTests(provider: VideoProvider | null): void {
  cached = provider
}

export function videoJoinWindow(): { beforeMinutes: number; afterMinutes: number } {
  return {
    beforeMinutes: env.VIDEO_JOIN_WINDOW_BEFORE_MINUTES ?? 10,
    afterMinutes: env.VIDEO_JOIN_WINDOW_AFTER_MINUTES ?? 30,
  }
}
