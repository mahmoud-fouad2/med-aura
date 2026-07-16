import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AppState, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeOut } from "react-native-reanimated"
import { AppText, Button } from "./ui"
import { brandAssets, Logo } from "./brand"
import {
  appLockEnabledSync,
  authenticate,
  isAppLockEnabled,
} from "../lib/app-lock"
import { useI18n } from "../lib/i18n"
import { colors, spacing } from "../theme"

/**
 * Wraps the whole navigator. While locked it overlays a branded lock screen
 * (children stay mounted, so navigation state survives a re-lock) and asks
 * for biometrics — with the device PIN as the OS-level fallback. Re-locks
 * whenever the app goes to the background with the preference on.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  // null = still reading the preference (the first frames after cold start,
  // while the native splash is typically still covering the app).
  const [locked, setLocked] = useState<boolean | null>(null)
  const lockedRef = useRef(false)
  const promptingRef = useRef(false)

  const applyLocked = useCallback((value: boolean) => {
    lockedRef.current = value
    setLocked(value)
  }, [])

  const unlock = useCallback(async () => {
    if (promptingRef.current) return
    promptingRef.current = true
    try {
      const ok = await authenticate(t.lock.prompt, t.common.cancel)
      if (ok) applyLocked(false)
    } finally {
      promptingRef.current = false
    }
  }, [applyLocked, t])

  useEffect(() => {
    let alive = true
    void isAppLockEnabled().then((enabled) => {
      if (!alive) return
      applyLocked(enabled)
      if (enabled) void unlock()
    })
    const sub = AppState.addEventListener("change", (next) => {
      // The device-credential fallback opens its own activity, backgrounding
      // the app mid-prompt — never re-lock underneath an active prompt.
      if (promptingRef.current) return
      if (next === "background" && appLockEnabledSync()) applyLocked(true)
      else if (next === "active" && lockedRef.current) void unlock()
    })
    return () => {
      alive = false
      sub.remove()
    }
  }, [applyLocked, unlock])

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked !== false ? (
        <Animated.View
          exiting={FadeOut.duration(220)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary }]}
        >
          <Image
            source={brandAssets.splashBg}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          {locked ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: spacing.screen,
                gap: spacing.xl,
              }}
            >
              <Logo height={40} variant="white" />
              <View style={{ alignItems: "center", gap: spacing.sm }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(255,255,255,0.14)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: spacing.xs,
                  }}
                >
                  <Ionicons name="finger-print" size={30} color="#FFFFFF" />
                </View>
                <AppText
                  variant="heading"
                  weight="bold"
                  color="#FFFFFF"
                  style={{ textAlign: "center" }}
                >
                  {t.lock.title}
                </AppText>
                <AppText
                  variant="sub"
                  color="rgba(255,255,255,0.8)"
                  style={{ textAlign: "center" }}
                >
                  {t.lock.body}
                </AppText>
              </View>
              <Button
                label={t.lock.unlock}
                icon="finger-print-outline"
                onPress={() => void unlock()}
                style={{
                  backgroundColor: colors.gold,
                  paddingHorizontal: spacing.xl,
                }}
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  )
}
