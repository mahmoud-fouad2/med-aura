import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Share, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, ChevronBack } from "../components/ui"
import { useReferral } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

function formatReward(type: "PERCENTAGE" | "FIXED", value: string, currency: string): string {
  return type === "PERCENTAGE" ? `${value}%` : `${value} ${currency}`
}

export default function Referral() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const { data, isLoading, error } = useReferral()
  const [copied, setCopied] = useState<"code" | "link" | null>(null)

  async function copy(text: string, which: "code" | "link") {
    await Clipboard.setStringAsync(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  async function shareInvite() {
    if (!data) return
    try {
      await Share.share({ message: `${t.referral.shareMessage(data.code)} ${data.shareUrl}` })
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.md,
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t.common.back} hitSlop={8}>
          <ChevronBack size={22} />
        </Pressable>
        <AppText variant="title" weight="heavy">
          {t.referral.title}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
      >
        {isLoading || !data ? (
          error ? (
            <AppText variant="body" color={colors.textMuted} style={{ textAlign: "center", marginTop: spacing.xxl }}>
              {t.referral.loadError}
            </AppText>
          ) : (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
          )
        ) : !data.programActive ? (
          <Card style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <AppText variant="body" color={colors.textMuted} style={{ textAlign: "center" }}>
              {t.referral.inactive}
            </AppText>
          </Card>
        ) : (
          <>
            <AppText variant="sub" color={colors.textMuted}>
              {t.referral.subtitle}
            </AppText>

            <Card style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="gift-outline" size={18} color={colors.primary} />
                <AppText variant="caption" weight="medium" color={colors.text} style={{ flex: 1 }}>
                  {t.referral.rewardSummary(
                    formatReward(data.referrerRewardType, data.referrerRewardValue, data.currency),
                    formatReward(data.refereeRewardType, data.refereeRewardValue, data.currency),
                  )}
                </AppText>
              </View>

              <View style={{ gap: spacing.xs }}>
                <AppText variant="caption" color={colors.textMuted}>
                  {t.referral.yourCode}
                </AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <View
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: colors.primary,
                      borderRadius: radius.md,
                      backgroundColor: colors.primarySoft,
                      paddingVertical: spacing.md,
                      alignItems: "center",
                    }}
                  >
                    <AppText variant="title" weight="heavy" color={colors.primary} style={{ letterSpacing: 3 }}>
                      {data.code}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => void copy(data.code, "code")}
                    accessibilityRole="button"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={copied === "code" ? "checkmark" : "copy-outline"} size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <AppText variant="caption" color={colors.textMuted}>
                  {t.referral.shareLink}
                </AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <View
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      justifyContent: "center",
                      paddingHorizontal: spacing.md,
                    }}
                  >
                    <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {data.shareUrl}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => void copy(data.shareUrl, "link")}
                    accessibilityRole="button"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={copied === "link" ? "checkmark" : "copy-outline"} size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              <Button label={t.referral.share} onPress={() => void shareInvite()} />
            </Card>

            <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.lg,
                  backgroundColor: colors.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="people-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-around" }}>
                <View style={{ alignItems: "center" }}>
                  <AppText variant="title" weight="heavy">
                    {data.invitedCount.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t.referral.invited}
                  </AppText>
                </View>
                <View style={{ alignItems: "center" }}>
                  <AppText variant="title" weight="heavy">
                    {data.rewardedCount.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t.referral.rewarded}
                  </AppText>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  )
}
