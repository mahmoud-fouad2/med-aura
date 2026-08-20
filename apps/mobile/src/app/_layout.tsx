import { useEffect, useRef } from "react"
import { I18nManager, Platform, View } from "react-native"
import { router, Stack, usePathname } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import * as Notifications from "expo-notifications"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionExpiredError } from "../lib/api"
import { I18nProvider, useI18n } from "../lib/i18n"
import { AppLockGate } from "../components/app-lock"
import { RootErrorBoundary } from "../components/error-boundary"
import { resolveNotificationDestination } from "../lib/notification-routes"
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
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout() {
  const pathname = usePathname()
  const handledNotification = useRef<string | null>(null)

  useEffect(() => {
    // Respect the device/app language. Arabic may use RTL, while English must
    // remain LTR; forcing one direction globally mirrors the wrong locale.
    I18nManager.allowRTL(true)
  }, [])

  useEffect(() => {
    if (Platform.OS === "web") return

    const openResponse = (response: Notifications.NotificationResponse) => {
      const notification = response.notification
      if (handledNotification.current === notification.request.identifier) return
      handledNotification.current = notification.request.identifier
      const destination = resolveNotificationDestination(notification.request.content.data)
      router.push(destination as Parameters<typeof router.push>[0])
      Notifications.clearLastNotificationResponse()
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openResponse(response)
    })
    const sub = Notifications.addNotificationResponseReceivedListener(openResponse)
    return () => sub.remove()
  }, [])

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <DirectionalShell>
              <StatusBar style={pathname === "/" ? "light" : "dark"} />
              <AppLockGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: "fade_from_bottom",
                  }}
                />
              </AppLockGate>
            </DirectionalShell>
          </I18nProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  )
}

function DirectionalShell({ children }: { children: React.ReactNode }) {
  const { isRTL } = useI18n()
  return <View style={{ flex: 1, direction: isRTL ? "rtl" : "ltr" }}>{children}</View>
}
