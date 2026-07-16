import { View } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, Skeleton } from "./ui"
import { useVideoState } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/**
 * "Remote consultation" card on the appointment details screen. Renders only
 * for video appointments, and only ever shows a working entry: when the
 * provider is disabled there is a plain explanation and NO button — a join
 * button that cannot join is forbidden.
 */
export function VideoCard({ appointmentId }: { appointmentId: string }) {
  const { t, locale } = useI18n()
  const state = useVideoState(appointmentId)

  if (state.isLoading) {
    return (
      <Card style={{ gap: spacing.md }}>
        <Skeleton style={{ width: "45%" }} />
        <Skeleton style={{ height: 40, borderRadius: radius.md }} />
      </Card>
    )
  }
  // The card is an enhancement — a failed state check must not break the
  // details screen; the pre-join screen still gates everything server-side.
  if (!state.data) return null

  const s = state.data
  const opensAt = s.joinAvailableFrom ? new Date(s.joinAvailableFrom) : null
  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"

  const statusText = !s.configured
    ? t.video.reasons.disabled
    : s.allowed
      ? s.counterpartJoined
        ? t.video.counterpartWaiting
        : t.video.cardReady
      : s.reason === "too_early" && opensAt
        ? `${t.video.cardCountdown} (${opensAt.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit" })})`
        : (t.video.reasons[s.reason ?? ""] ?? t.video.cardCountdown)

  return (
    <Card style={{ gap: spacing.md, borderColor: colors.primary, borderWidth: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.lg,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="videocam" size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="sub" weight="bold">
            {t.video.cardTitle}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {statusText}
          </AppText>
        </View>
      </View>

      {s.configured ? (
        <Button
          label={s.allowed ? t.video.join : t.video.prepare}
          icon={s.allowed ? "videocam" : "settings-outline"}
          variant={s.allowed ? "primary" : "secondary"}
          onPress={() => router.push(`/appointment/${appointmentId}/video`)}
        />
      ) : null}
    </Card>
  )
}
