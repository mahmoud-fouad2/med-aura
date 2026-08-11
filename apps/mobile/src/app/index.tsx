import { useEffect, useState } from "react"
import { Redirect } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { authClient } from "../lib/auth-client"
import { secureStoreWarmed } from "../lib/secure-warm"
import { isRememberMe } from "../lib/session-prefs"
import { readPlatformStorage } from "../lib/platform-storage"
import { registerForPushNotifications } from "../lib/push-notifications"
import { BrandSplash } from "../components/splash-screen"

export const ONBOARDING_KEY = "medaura.onboarding.done"

type BootState =
  | { status: "loading" }
  | { status: "onboarding" }
  | { status: "auth" }
  | { status: "app" }

/**
 * Boot gate: decides the first screen before anything is visible.
 * Order: onboarding (first run) → sign-in (no session) → the app.
 */
export default function Boot() {
  const [state, setState] = useState<BootState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    async function boot() {
      // The session cookie lives in the keychain; its async read into the
      // sync buffer @better-auth/expo attaches from must finish before
      // getSession() fires, or the request goes out unauthenticated and a
      // valid session looks gone (cold-start drop to sign-in). See
      // secure-warm.ts.
      await secureStoreWarmed
      const [seen, remember, session] = await Promise.all([
        readPlatformStorage(ONBOARDING_KEY),
        isRememberMe(),
        authClient.getSession().catch(() => null),
      ])
      if (cancelled) return
      const hasSession = Boolean(
        session && "data" in session && session.data?.user,
      )
      if (!seen) setState({ status: "onboarding" })
      else if (hasSession && remember) {
        setState({ status: "app" })
        // Fire-and-forget: never delays the redirect, and silently no-ops
        // without a linked EAS project or a granted permission.
        void registerForPushNotifications()
      }
      else if (hasSession && !remember) {
        // "Remember me" was off: a fresh cold start must require sign-in.
        // Drop the persisted session (best-effort, never blocks boot) so it
        // can't silently auto-restore.
        void Promise.race([
          authClient.signOut().catch(() => undefined),
          new Promise((r) => setTimeout(r, 2500)),
        ])
        setState({ status: "auth" })
      } else setState({ status: "auth" })
      await SplashScreen.hideAsync().catch(() => undefined)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === "onboarding") return <Redirect href="/onboarding" />
  if (state.status === "auth") return <Redirect href="/sign-in" />
  if (state.status === "app") return <Redirect href="/(tabs)" />
  // Session restore in flight — hold the branded splash rather than a blank
  // frame, so the native splash → app handoff never flashes.
  return <BrandSplash />
}
