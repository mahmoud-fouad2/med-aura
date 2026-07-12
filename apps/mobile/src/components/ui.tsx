import { type ReactNode } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { Image } from "expo-image"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { colors, radius, shadows, spacing, type } from "../theme"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** Brand text — one place to control family/weights later. */
export function AppText({
  children,
  variant = "body",
  color = colors.text,
  weight = "regular",
  style,
  numberOfLines,
  onPress,
}: {
  children: ReactNode
  variant?: keyof typeof type
  color?: string
  weight?: "regular" | "medium" | "bold" | "heavy"
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  onPress?: () => void
}) {
  const fontWeight = (
    { regular: "400", medium: "600", bold: "700", heavy: "800" } as const
  )[weight]
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      style={[
        {
          fontSize: type[variant],
          color,
          fontWeight,
          lineHeight: type[variant] * 1.5,
          textAlign: "left",
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

/** Primary/secondary button with press-scale animation + light haptics. */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
}: {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "ghost"
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  style?: StyleProp<ViewStyle>
}) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.primarySoft
        : "transparent"
  const fg = variant === "primary" ? "#FFFFFF" : colors.primary

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 20, stiffness: 300 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 })
      }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          paddingVertical: 14,
          paddingHorizontal: spacing.xl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          opacity: disabled || loading ? 0.55 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <AppText variant="body" weight="bold" color={fg}>
            {label}
          </AppText>
        </>
      )}
    </AnimatedPressable>
  )
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    shadows.card,
    style,
  ]
  if (!onPress) return <View style={base}>{children}</View>
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      style={({ pressed }) => [base, pressed && { opacity: 0.92 }]}
    >
      {children}
    </Pressable>
  )
}

/** Photo avatar with professional initials fallback (never a gray box). */
export function Avatar({
  name,
  photoUrl,
  size = 52,
}: {
  name: string
  photoUrl?: string | null
  size?: number
}) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={200}
      />
    )
  }
  const initial = name.replace(/^د\.?\s*/, "").trim().charAt(0) || "؟"
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <AppText
        weight="bold"
        color={colors.primary}
        style={{ fontSize: size * 0.4, lineHeight: size * 0.55 }}
      >
        {initial}
      </AppText>
    </View>
  )
}

/** Status pill with semantic tone. */
export function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: "success" | "warning" | "danger" | "info" | "neutral"
}) {
  const map = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: "#F1EFF6", fg: colors.textMuted },
  }[tone]
  return (
    <View
      style={{
        backgroundColor: map.bg,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <AppText variant="caption" weight="bold" color={map.fg}>
        {label}
      </AppText>
    </View>
  )
}

/** Pulsing skeleton block for list/card loading. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.5)
  opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true)
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View
      style={[
        { backgroundColor: "#ECE8F4", borderRadius: radius.md, height: 16 },
        animated,
        style,
      ]}
    />
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primaryMuted} />
      </View>
      <AppText variant="heading" weight="bold" style={{ textAlign: "center" }}>
        {title}
      </AppText>
      {body ? (
        <AppText
          variant="sub"
          color={colors.textMuted}
          style={{ textAlign: "center" }}
        >
          {body}
        </AppText>
      ) : null}
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
})
