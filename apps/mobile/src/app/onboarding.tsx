import { useCallback, useRef, useState } from "react"
import {
  Dimensions,
  FlatList,
  I18nManager,
  Pressable,
  View,
  type ViewToken,
} from "react-native"
import { router } from "expo-router"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as SecureStore from "expo-secure-store"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated"
import { AppText, Button } from "../components/ui"
import { Logo, onboardingArt } from "../components/brand"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"
import { ONBOARDING_KEY } from "./index"

const { width: SCREEN_W } = Dimensions.get("window")

const SLIDE_ART = [
  onboardingArt.trust,
  onboardingArt.consult,
  onboardingArt.journey,
  onboardingArt.privacy,
] as const

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

  // FlatList requires this callback to keep a stable identity for its whole
  // life; useCallback with no deps gives that without reading a ref during
  // render (which the compiler rejects).
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]
      if (first?.index != null) setIndex(first.index)
    },
    [],
  )

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.lg,
      }}
    >
      {/* Brand bar: the logo is present from the very first screen. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.screen,
          paddingVertical: spacing.sm,
        }}
      >
        <Logo height={30} />
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
              gap: spacing.lg,
            }}
          >
            <Image
              source={SLIDE_ART[i]}
              style={{
                width: Math.min(SCREEN_W - spacing.xl * 2, 320),
                height: Math.min(SCREEN_W - spacing.xl * 2, 320),
              }}
              contentFit="contain"
              transition={260}
              // Decorative: the title/body below already carry the meaning.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View style={{ gap: spacing.sm, alignItems: "center" }}>
              <AppText variant="title" weight="heavy" style={{ textAlign: "center" }}>
                {item.title}
              </AppText>
              <AppText
                variant="body"
                color={colors.textMuted}
                style={{ textAlign: "center", maxWidth: 320 }}
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
              accessibilityRole="button"
              accessibilityLabel={t.common.back}
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
              {/* "Back" points at the previous slide, which sits to the right
                  in Arabic and to the left in English. */}
              <Ionicons
                name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
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

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 8, { duration: 200 }),
    backgroundColor: withTiming(active ? colors.primary : colors.border, {
      duration: 200,
    }),
  }))
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />
}
