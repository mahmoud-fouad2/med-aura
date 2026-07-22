import { useEffect } from "react"
import { I18nManager } from "react-native"
import { router, Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import * as Notifications from "expo-notifications"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionExpiredError } from "../lib/api"
import { I18nProvider } from "../lib/i18n"
import { AppLockGate } from "../components/app-lock"
import "../lib/push-notifications"
import { colors } from "../theme"

// The boot gate (app/index.tsx) hides the splash once routing is decided —
// the user never sees a flash of the wrong screen.
void SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  // One place decides what an expired session means: drop the account's
  // cached data and land on sign-in — instead of every screen showing its
  // own error over stale content.
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        queryClient.clear()
        router.replace("/sign-in")
      }
    },
  }),
  defaultOptions: {
    queries: {
      // Retrying an expired session can't succeed — fail fast to the redirect.
      retry: (failureCount, error) =>
        !(error instanceof SessionExpiredError) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout() {
  useEffect(() => {
    // Arabic-first product. Release builds get RTL from the very first frame
    // via the native `forcesRTL` flag (app.json → expo-localization); this is
    // the fallback for environments where config plugins don't run (Expo Go),
    // where it still needs one restart to apply.
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true)
      I18nManager.forceRTL(true)
    }
  }, [])

  useEffect(() => {
    // A tapped push always opens the in-app notifications list, never the
    // raw `href` the notification carries — that field is a web dashboard
    // route (e.g. /dashboard/cases/{id}) the native app has no matching
    // screen for. The same notification is already listed there.
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/notifications")
    })
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <StatusBar style="dark" />
          <AppLockGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: "fade_from_bottom",
              }}
            />
          </AppLockGate>
        </I18nProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
