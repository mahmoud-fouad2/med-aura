import { useEffect, useState } from "react"
import { View } from "react-native"
import { Redirect } from "expo-router"
import * as SecureStore from "expo-secure-store"
import * as SplashScreen from "expo-splash-screen"
import { authClient } from "../lib/auth-client"
import { colors } from "../theme"

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
      const [seen, session] = await Promise.all([
        SecureStore.getItemAsync(ONBOARDING_KEY),
        authClient.getSession().catch(() => null),
      ])
      if (cancelled) return
      if (!seen) setState({ status: "onboarding" })
      else if (session && "data" in session && session.data?.user)
        setState({ status: "app" })
      else setState({ status: "auth" })
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
  // Splash is still covering the screen — keep the frame brand-colored.
  return <View style={{ flex: 1, backgroundColor: colors.background }} />
}
