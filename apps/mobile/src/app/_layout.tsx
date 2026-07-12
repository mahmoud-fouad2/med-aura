import { useEffect } from "react"
import { I18nManager } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { I18nProvider } from "../lib/i18n"
import { colors } from "../theme"

// The boot gate (app/index.tsx) hides the splash once routing is decided —
// the user never sees a flash of the wrong screen.
void SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export default function RootLayout() {
  useEffect(() => {
    // Arabic-first product: the very first launch renders RTL immediately.
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true)
      I18nManager.forceRTL(true)
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "fade_from_bottom",
            }}
          />
        </I18nProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
