import { useCallback, useEffect, type ReactNode } from "react"
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { Image, type ImageSource } from "expo-image"
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
  selectable,
}: {
  children: ReactNode
  variant?: keyof typeof type
  color?: string
  weight?: "regular" | "medium" | "bold" | "heavy"
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  onPress?: () => void
  /** Long-press to copy — for references and other support-facing values. */
  selectable?: boolean
}) {
  const fontWeight = (
    { regular: "400", medium: "600", bold: "700", heavy: "800" } as const
  )[weight]
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      selectable={selectable}
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
    transform: [{ scale: scale.get() }],
  }))

  // `.set()`/`.get()` rather than `.value` — the compiler treats a hook's
  // return value as immutable and rejects `.value =`, while these accessors
  // are Reanimated's supported, compiler-safe API for the same thing.
  const handlePressIn = useCallback(() => {
    scale.set(withSpring(0.97, { damping: 20, stiffness: 300 }))
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.set(withSpring(1, { damping: 20, stiffness: 300 }))
  }, [scale])
  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }, [onPress])

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
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
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
      accessibilityRole="button"
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

/**
 * Direction-aware chevrons. "Back" and "forward" are *logical* directions:
 * back points right in Arabic and left in English. Hardcoding
 * `chevron-back`/`chevron-forward` looks correct in one language and
 * backwards in the other, so every navigational chevron goes through here.
 */
export function ChevronBack({
  size = 20,
  color = colors.text,
}: {
  size?: number
  color?: string
}) {
  return (
    <Ionicons
      name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
      size={size}
      color={color}
    />
  )
}

/** Points "onward" — into a detail screen, or the next item in a list. */
export function ChevronForward({
  size = 20,
  color = colors.textFaint,
}: {
  size?: number
  color?: string
}) {
  return (
    <Ionicons
      name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
      size={size}
      color={color}
    />
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
  // Start the loop once on mount. Kicking it off during render (as this did)
  // restarts the pulse on every re-render, so the shimmer visibly stutters
  // whenever the parent updates.
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true))
  }, [opacity])
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }))
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

/**
 * Empty/status block. Prefers a brand illustration (`art`) and falls back to
 * a tinted icon disc — so a screen without dedicated art still looks finished
 * rather than broken.
 */
export function EmptyState({
  icon,
  art,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap
  /** Illustration from `stateArt` — takes precedence over `icon`. */
  art?: ImageSource
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <View style={styles.empty}>
      {art ? (
        <Image
          source={art}
          style={{ width: 190, height: 143 }}
          contentFit="contain"
          transition={220}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : (
        <View style={styles.emptyIcon}>
          <Ionicons name={icon} size={30} color={colors.primaryMuted} />
        </View>
      )}
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
