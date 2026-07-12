import { useRef, useState } from "react"
import {
  Dimensions,
  FlatList,
  Pressable,
  View,
  type ViewToken,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as SecureStore from "expo-secure-store"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { AppText, Button } from "../components/ui"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"
import { ONBOARDING_KEY } from "./index"

const { width: SCREEN_W } = Dimensions.get("window")

const SLIDE_ICONS = [
  "shield-checkmark",
  "videocam",
  "calendar",
  "lock-closed",
] as const

const SLIDE_TINTS = ["#F3EEFC", "#FBF1DE", "#E8F0FB", "#E5F5EC"] as const

export default function Onboarding() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const listRef = useRef<FlatList>(null)
  const [index, setIndex] = useState(0)
  const slides = t.onboarding.slides
  const isLast = index === slides.length - 1

  const finish = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "1")
    router.replace("/sign-in")
  }

  const goTo = (i: number) => {
    void Haptics.selectionAsync()
    listRef.current?.scrollToIndex({ index: i, animated: true })
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]
      if (first?.index != null) setIndex(first.index)
    },
  ).current

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.lg,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: spacing.screen,
        }}
      >
        <Pressable onPress={() => void finish()} hitSlop={12}>
          <AppText variant="sub" weight="medium" color={colors.textMuted}>
            {t.common.skip}
          </AppText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index: i }) => (
          <View
            style={{
              width: SCREEN_W,
              paddingHorizontal: spacing.xl,
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.xl,
            }}
          >
            <SlideVisual icon={SLIDE_ICONS[i]} tint={SLIDE_TINTS[i]} />
            <View style={{ gap: spacing.sm, alignItems: "center" }}>
              <AppText variant="title" weight="heavy" style={{ textAlign: "center" }}>
                {item.title}
              </AppText>
              <AppText
                variant="body"
                color={colors.textMuted}
                style={{ textAlign: "center", maxWidth: 300 }}
              >
                {item.body}
              </AppText>
            </View>
          </View>
        )}
      />

      <View style={{ gap: spacing.xl, paddingHorizontal: spacing.screen }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.sm,
          }}
        >
          {slides.map((_, i) => (
            <Dot key={i} active={i === index} />
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          {index > 0 ? (
            <Pressable
              onPress={() => goTo(index - 1)}
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="arrow-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
          <Button
            label={isLast ? t.common.start : t.common.next}
            onPress={() => (isLast ? void finish() : goTo(index + 1))}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  )
}

/** Layered brand visual — soft tinted disc, ring, and a bold icon. */
function SlideVisual({
  icon,
  tint,
}: {
  icon: (typeof SLIDE_ICONS)[number]
  tint: string
}) {
  const scale = useSharedValue(0.9)
  scale.value = withSpring(1, { damping: 14, stiffness: 120 })
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  return (
    <Animated.View
      style={[
        {
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name={icon} size={64} color={colors.primary} />
      </View>
      <View
        style={{
          position: "absolute",
          top: 18,
          right: 26,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.gold,
          opacity: 0.85,
        }}
      />
    </Animated.View>
  )
}

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 8, { duration: 200 }),
    backgroundColor: active ? colors.primary : colors.border,
  }))
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />
}
