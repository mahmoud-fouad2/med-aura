import { type ReactNode } from "react"
import { Modal, Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated"
import { AppText } from "./ui"
import { colors, radius, spacing } from "../theme"

/**
 * The app's single bottom-sheet primitive. Every confirm/pick/act flow uses
 * it instead of `Alert.alert` — system alerts look like a different app and
 * can't carry brand type, colour, or an illustration.
 *
 * Handles the things a hand-rolled Modal usually forgets: backdrop dismiss,
 * a drag handle affordance, bottom safe-area padding (so the primary button
 * never sits under the home indicator), and enter/exit animation on both
 * the backdrop and the sheet.
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={{ flex: 1, backgroundColor: colors.overlay }}
        >
          {/* Tapping the backdrop dismisses; the sheet itself swallows the
              press so an inner tap never closes it. */}
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="إغلاق" />
          <Animated.View
            entering={SlideInDown.springify().damping(18).stiffness(160)}
            exiting={SlideOutDown.duration(180)}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.xl,
              gap: spacing.lg,
            }}
          >
            <Pressable onPress={onClose} accessibilityLabel="إغلاق">
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
        </Animated.View>
      ) : null}
    </Modal>
  )
}
