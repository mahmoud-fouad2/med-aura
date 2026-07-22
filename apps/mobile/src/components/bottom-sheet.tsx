import { useEffect, useState, type ReactNode } from "react"
import { Modal, Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { AppText } from "./ui"
import { colors, radius, spacing } from "../theme"

// Comfortably below any phone's screen height — only used to place the
// sheet off-screen before/after the animation, never seen while visible.
const OFFSCREEN_Y = 700

/**
 * The app's single bottom-sheet primitive. Every confirm/pick/act flow uses
 * it instead of `Alert.alert` — system alerts look like a different app and
 * can't carry brand type, colour, or an illustration.
 *
 * The slide/fade is driven manually and gated on the native Modal's own
 * `onShow` callback rather than Reanimated's declarative `entering`/
 * `exiting` props. On Android, `Modal` renders into a separate native
 * window; starting a Reanimated *layout* transition before that window has
 * actually finished presenting is what made the sheet visibly jump/settle
 * more than once and made the first tap on its buttons unreliable — the
 * touch regions and the mid-transition visual position could momentarily
 * disagree. A plain transform animation started only after `onShow` fires
 * doesn't have that race.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
}: {
  visible: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  // Stays true through the closing animation — visible flips to false
  // immediately, but the Modal (and its content) only unmounts once the
  // slide-down has actually finished.
  const [mounted, setMounted] = useState(visible)
  const progress = useSharedValue(0)

  // Mounting on becoming visible happens during render (React's recommended
  // "adjust state during render" pattern) — the entrance animation itself
  // starts from the Modal's onShow, not here, so it never races the native
  // window's own transition.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      if (mounted) {
        // Re-opened before the previous close animation finished — the
        // Modal itself never actually dropped, so its onShow won't refire.
        // Restart the entrance directly instead of leaving the sheet stuck
        // mid-close.
        progress.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }))
      }
      setMounted(true)
    }
  }

  useEffect(() => {
    if (!visible && mounted) {
      progress.set(
        withTiming(0, { duration: 160, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(setMounted)(false)
        }),
      )
    }
  }, [visible, mounted, progress])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }))
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * OFFSCREEN_Y }],
  }))

  if (!mounted) return null

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      onShow={() => {
        progress.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }))
      }}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          style={[{ flex: 1, backgroundColor: colors.overlay }, backdropStyle]}
        >
          {/* Tapping the backdrop dismisses; the sheet itself swallows the
              press so an inner tap never closes it. */}
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="إغلاق" />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.card,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.xl,
              gap: spacing.lg,
            },
            sheetStyle,
          ]}
        >
          <Pressable onPress={onClose} accessibilityLabel="إغلاق" hitSlop={12}>
            <View
              style={{
                alignSelf: "center",
                width: 44,
                height: 5,
                borderRadius: radius.full,
                backgroundColor: colors.border,
              }}
            />
          </Pressable>

          {title || description ? (
            <View style={{ gap: spacing.xs, alignItems: "center" }}>
              {title ? (
                <AppText variant="heading" weight="bold">
                  {title}
                </AppText>
              ) : null}
              {description ? (
                <AppText
                  variant="sub"
                  color={colors.textMuted}
                  style={{ textAlign: "center" }}
                >
                  {description}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {children}
        </Animated.View>
      </View>
    </Modal>
  )
}
