import { useCallback } from "react"
import { Pressable, View } from "react-native"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated"
import { useFavorites, useToggleFavorite, type FavoriteDoctor } from "../lib/api"
import { colors } from "../theme"

/**
 * A heart toggle for favouriting a doctor. Reads the shared `["favorites"]`
 * cache so its filled/outline state stays in sync everywhere the same doctor
 * appears, and toggles optimistically (see useToggleFavorite).
 *
 * `variant="overlay"` is the translucent circular button that floats on a
 * photo/card; `variant="plain"` is a bare icon for use inside a header row.
 */
export function FavoriteHeart({
  doctor,
  size = 22,
  variant = "overlay",
}: {
  doctor: FavoriteDoctor
  size?: number
  variant?: "overlay" | "plain"
}) {
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const isFavorite = (favorites.data?.doctors ?? []).some((d) => d.id === doctor.id)

  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))

  const onPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // A quick pop — pressing the heart should feel as alive as the action.
    scale.set(withSequence(withSpring(1.28, { damping: 6, stiffness: 320 }), withSpring(1)))
    toggle.mutate(doctor)
  }, [scale, toggle, doctor])

  const icon = (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={isFavorite ? "heart" : "heart-outline"}
        size={size}
        color={isFavorite ? colors.danger : variant === "overlay" ? colors.text : colors.textMuted}
      />
    </Animated.View>
  )

  if (variant === "plain") {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityState={{ selected: isFavorite }}
      >
        {icon}
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
    >
      <View
        style={{
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          backgroundColor: "rgba(255,255,255,0.92)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
    </Pressable>
  )
}
