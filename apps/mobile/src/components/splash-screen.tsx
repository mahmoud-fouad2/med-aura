import { useEffect } from "react"
import { View } from "react-native"
import { Image } from "expo-image"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import { brandAssets, Logo } from "./brand"
import { colors } from "../theme"

/**
 * In-app splash that continues the native splash's look while the boot gate
 * restores the session. Without it the user sees the native splash (purple)
 * snap to a blank frame and then the app — a visible flash. This keeps the
 * same purple surface on screen and fades the logo in, so the handoff reads
 * as one continuous animation.
 */
export function BrandSplash() {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.94)

  useEffect(() => {
    opacity.set(withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }))
    scale.set(
      withDelay(60, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })),
    )
  }, [opacity, scale])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }))

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <Image
        source={brandAssets.splashBg}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
      />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={logoStyle}>
          <Logo height={72} variant="white" />
        </Animated.View>
      </View>
    </View>
  )
}
