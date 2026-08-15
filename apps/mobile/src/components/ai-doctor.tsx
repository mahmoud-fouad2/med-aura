import { useEffect } from "react"
import { View, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { colors } from "../theme"

/**
 * "د. أورا" — the AI concierge's character: a friendly robot doctor in a
 * white coat with the brand-purple head, a gold stethoscope, and a subtle
 * antenna. Drawn as SVG rather than shipped as a raster asset so it stays
 * crisp at every size (28px avatar → 96px hero), themes with the brand
 * palette, and costs no bundle weight.
 *
 * `animated` adds a slow blink and a gentle antenna pulse — just enough life
 * to read as "an assistant that's listening", without a distracting loop.
 */
export function AiDoctor({
  size = 64,
  animated = false,
  style,
}: {
  size?: number
  animated?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const blink = useSharedValue(1)
  const pulse = useSharedValue(0.6)

  useEffect(() => {
    if (!animated) return
    // Long pause, quick double-blink — the rhythm that reads as "alive"
    // rather than "flickering".
    blink.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600 }),
          withTiming(0.1, { duration: 90 }),
          withTiming(1, { duration: 90 }),
        ),
        -1,
        false,
      ),
    )
    pulse.set(
      withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
            withTiming(0.5, { duration: 900, easing: Easing.in(Easing.cubic) }),
          ),
          -1,
          false,
        ),
      ),
    )
  }, [animated, blink, pulse])

  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.get() }] }))
  const antennaStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }))

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Antenna stalk + white coat shoulders sit behind the head. */}
        <Path d="M50 20 L50 12" stroke={colors.primaryMuted} strokeWidth={3} strokeLinecap="round" />
        <G>
          {/* Coat */}
          <Path
            d="M22 100 C22 82 34 74 50 74 C66 74 78 82 78 100 Z"
            fill="#FFFFFF"
            stroke={colors.border}
            strokeWidth={1.5}
          />
          {/* Coat lapels */}
          <Path d="M50 74 L42 100 M50 74 L58 100" stroke={colors.border} strokeWidth={1.5} />
          {/* Collar */}
          <Path d="M42 76 L50 84 L58 76" fill={colors.primarySoft} />
        </G>

        {/* Gold stethoscope — the "doctor" signal, in the brand accent. */}
        <Path
          d="M40 78 C40 92 60 92 60 78"
          stroke={colors.gold}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx="60" cy="90" r="4" fill={colors.gold} />

        {/* Head */}
        <Rect x="26" y="22" width="48" height="44" rx="16" fill={colors.primary} />
        {/* Face plate */}
        <Rect x="32" y="30" width="36" height="27" rx="12" fill="#F6F2FF" />
        {/* Ears / side modules */}
        <Rect x="20" y="38" width="6" height="14" rx="3" fill={colors.primaryMuted} />
        <Rect x="74" y="38" width="6" height="14" rx="3" fill={colors.primaryMuted} />

        {/* Medical cross badge on the forehead */}
        <Path
          d="M50 24.5 v5 M47.5 27 h5"
          stroke={colors.gold}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>

      {/* Eyes + antenna tip overlay on their own animated layers, so only
          these repaint while the rest of the character stays static. */}
      <Animated.View
        style={[
          { position: "absolute", left: 0, top: 0, width: size, height: size },
          animated ? eyeStyle : undefined,
        ]}
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Ellipse cx="42" cy="43" rx="3.6" ry="4.4" fill={colors.primary} />
          <Ellipse cx="58" cy="43" rx="3.6" ry="4.4" fill={colors.primary} />
          {/* Smile */}
          <Path
            d="M44 51 C47 54 53 54 56 51"
            stroke={colors.primaryMuted}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          { position: "absolute", left: 0, top: 0, width: size, height: size },
          animated ? antennaStyle : undefined,
        ]}
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="10" r="5" fill={colors.gold} />
        </Svg>
      </Animated.View>
    </View>
  )
}
