import { useState } from "react"
import { Modal, Pressable, ScrollView, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import * as WebBrowser from "expo-web-browser"
import * as SecureStore from "expo-secure-store"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Avatar, Button, Card, Skeleton } from "../../components/ui"
import { authClient } from "../../lib/auth-client"
import { useMe } from "../../lib/api"
import { API_URL } from "../../lib/config"
import { useI18n, type Locale } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { ONBOARDING_KEY } from "../index"

export default function Profile() {
  const { t, locale, setLocale } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const me = useMe()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    await authClient.signOut().catch(() => undefined)
    // Never leave one account's data visible to the next.
    queryClient.clear()
    setSigningOut(false)
    setConfirmOpen(false)
    router.replace("/sign-in")
  }

  const switchLanguage = async (l: Locale) => {
    if (l === locale) return
    await setLocale(l)
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        padding: spacing.screen,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
    >
      <AppText variant="title" weight="heavy">
        {t.profile.title}
      </AppText>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        {me.isLoading ? (
          <>
            <Skeleton style={{ width: 56, height: 56, borderRadius: 28 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton style={{ width: "50%" }} />
              <Skeleton style={{ width: "70%" }} />
            </View>
          </>
        ) : (
          <>
            <Avatar name={me.data?.name ?? "؟"} size={56} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold">
                {me.data?.name ?? ""}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {me.data?.email ?? ""}
              </AppText>
            </View>
          </>
        )}
      </Card>

      {/* Language */}
      <Card style={{ gap: spacing.md }}>
        <AppText variant="sub" weight="bold">
          {t.profile.language}
        </AppText>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(
            [
              ["ar", t.profile.arabic],
              ["en", t.profile.english],
            ] as const
          ).map(([code, label]) => (
            <Pressable
              key={code}
              onPress={() => void switchLanguage(code)}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: 8,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: locale === code ? colors.primary : colors.border,
                backgroundColor: locale === code ? colors.primarySoft : "#FFFFFF",
              }}
            >
              <AppText
                variant="sub"
                weight={locale === code ? "bold" : "regular"}
                color={locale === code ? colors.primary : colors.textMuted}
              >
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="caption" color={colors.textFaint}>
          {t.profile.restartNote}
        </AppText>
      </Card>

      {/* Links */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="sparkles-outline"
          label={t.profile.aboutOnboarding}
          onPress={async () => {
            await SecureStore.deleteItemAsync(ONBOARDING_KEY)
            router.push("/onboarding")
          }}
        />
        <Divider />
        <Row
          icon="shield-outline"
          label={t.profile.privacy}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}
        />
        <Divider />
        <Row
          icon="document-text-outline"
          label={t.profile.terms}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)}
        />
        <Divider />
        <Row
          icon="help-buoy-outline"
          label={t.profile.support}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/contact`)}
        />
      </Card>

      <Button
        label={t.auth.signOut}
        variant="secondary"
        icon="log-out-outline"
        onPress={() => setConfirmOpen(true)}
        style={{ backgroundColor: colors.dangerSoft }}
      />

      {/* Native confirm sheet — never a system alert */}
      <Modal transparent visible={confirmOpen} animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}
          onPress={() => setConfirmOpen(false)}
        >
          <Pressable
            onPress={() => undefined}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
              gap: spacing.lg,
            }}
          >
            <View style={{ alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.dangerSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="log-out-outline" size={24} color={colors.danger} />
              </View>
              <AppText variant="heading" weight="bold">
                {t.auth.signOut}
              </AppText>
              <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
                {t.auth.signOutConfirm}
              </AppText>
            </View>
            <View style={{ gap: spacing.sm }}>
              <Button
                label={t.auth.signOut}
                onPress={() => void signOut()}
                loading={signingOut}
                style={{ backgroundColor: colors.danger }}
              />
              <Button label={t.common.cancel} variant="ghost" onPress={() => setConfirmOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: pressed ? colors.primarySoft : "transparent",
      })}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Ionicons name="chevron-back" size={16} color={colors.textFaint} />
    </Pressable>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />
}
