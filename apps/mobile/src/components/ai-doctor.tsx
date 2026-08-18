import { useEffect } from "react"
import { View, type StyleProp, type ViewStyle } from "react-native"
import { Image } from "expo-image"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { colors } from "../theme"

/**
 * "مستشار Med Aura" — the AI concierge's face. A friendly doctor portrait
 * that reads instantly as a person to talk to, rather than a generic AI
 * sparkle.
 *
 * The source art is already a self-contained circular avatar (purple disc,
 * white coat, stethoscope, chat bubble), so this renders it directly with no
 * outer ring or tinted backing — wrapping it in another circle just
 * double-frames the same shape.
 *
 * `glow` adds a slow breathing halo behind the avatar, so the concierge reads
 * as awake and listening instead of a flat sticker. It is opt-in because a
 * pulsing element in every chat bubble would be noise — use it on the tab
 * button and the hero, not on message avatars.
 */
const AVATAR = require("../../assets/brand/ai-doctor.png")

export function AiDoctor({
  size = 64,
  glow = false,
  style,
}: {
  size?: number
  /** Slow breathing halo — for the tab button and the empty-state hero. */
  glow?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (!glow) return
    // One slow in/out cycle. Deliberately gentle: a fast pulse on a medical
    // product reads as an alert, not as presence.
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
  }, [glow, pulse])

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + pulse.get() * 0.34,
    transform: [{ scale: 1 + pulse.get() * 0.14 }],
  }))

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 - pulse.get() * 0.42,
    transform: [{ scale: 1.04 + pulse.get() * 0.24 }],
  }))

  return (
    <View
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      {glow ? (
        <>
          {/* Soft filled halo that breathes with the avatar. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                width: size * 1.34,
                height: size * 1.34,
                borderRadius: size * 0.67,
                backgroundColor: colors.gold,
              },
              haloStyle,
            ]}
          />
          {/* A thin ring expanding outward — the "signal" beat. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: colors.gold,
              },
              ringStyle,
            ]}
          />
        </>
      ) : null}
      <Image
        source={AVATAR}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={160}
        accessibilityLabel="مستشار Med Aura"
      />
    </View>
  )
}
