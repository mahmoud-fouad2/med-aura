import { useEffect } from "react"
import { useWindowDimensions, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Logo } from "./brand"
import { AppText } from "./ui"
import { useI18n } from "../lib/i18n"
import { colors, spacing } from "../theme"

/**
 * In-app splash that continues the native splash's look while the boot gate
 * restores the session. Without it the user sees the native splash snap to a
 * blank frame and then the app — a visible flash. This keeps the same cream
 * brand surface + colored wordmark on screen and fades it in, so the handoff
 * from the native splash reads as one continuous animation.
 *
 * Sizing note: `Logo` renders the trimmed colored logo (~2.06:1, see
 * components/brand.tsx). Its bounded responsive height keeps the visible
 * wordmark comfortably scaled without crowding compact screens. This never
 * delays boot: the boot gate (app/index.tsx) still calls
 * SplashScreen.hideAsync() the moment session restore resolves, regardless
 * of how long this component has been visible.
 */
export function BrandSplash() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { t } = useI18n()
  const logoHeight = Math.min(150, Math.max(120, width * 0.36))
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.94)
  const footerOpacity = useSharedValue(0)

  useEffect(() => {
    opacity.set(withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }))
    scale.set(
      withDelay(60, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })),
    )
    footerOpacity.set(
      withDelay(320, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })),
    )
  }, [opacity, scale, footerOpacity])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }))
  const footerStyle = useAnimatedStyle(() => ({ opacity: footerOpacity.get() }))

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={logoStyle}>
          <Logo height={logoHeight} variant="ink" />
        </Animated.View>
      </View>
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: insets.bottom + spacing.xxl,
            left: spacing.xxl,
            right: spacing.xxl,
            alignItems: "center",
            gap: spacing.lg,
          },
          footerStyle,
        ]}
      >
        <LoadingDots />
        <AppText
          variant="sub"
          weight="medium"
          color={colors.textMuted}
          style={{ textAlign: "center" }}
        >
          {t.home.heroBody}
        </AppText>
      </Animated.View>
    </View>
  )
}

/** Three softly pulsing dots — an elegant "still working" cue that needs no
 *  real progress value, since session restore has no measurable percentage. */
function LoadingDots() {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Dot delay={0} />
      <Dot delay={160} />
      <Dot delay={320} />
    </View>
  )
}

function Dot({ delay }: { delay: number }) {
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }),
            withTiming(0, { duration: 460, easing: Easing.in(Easing.cubic) }),
          ),
          -1,
          false,
        ),
      ),
    )
  }, [pulse, delay])

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.get() * 0.65,
    transform: [{ scale: 0.7 + pulse.get() * 0.3 }],
  }))

  return (
    <Animated.View
      style={[
        { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
        style,
      ]}
    />
  )
}
