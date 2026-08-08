import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, ChevronBack } from "./ui"
import { colors, spacing } from "../theme"

export function NativeOnlyScreen({
  title,
  body,
  icon = "phone-portrait-outline",
}: {
  title: string
  body: string
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <ChevronBack size={22} />
        </Pressable>
        <AppText variant="title" weight="heavy">
          {title}
        </AppText>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={36} color={colors.primary} />
        </View>
        <AppText variant="heading" weight="heavy" style={{ marginTop: spacing.lg, textAlign: "center" }}>
          {title}
        </AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm, textAlign: "center" }}>
          {body}
        </AppText>
        <Button label="عودة" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.xl }} />
      </View>
    </View>
  )
}