import { useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { router } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Button,
  Card,
  ChevronBack,
  EmptyState,
  Skeleton,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import { api, useMyAvailability, type AvailabilityRule } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

const DAYS = [0, 1, 2, 3, 4, 5, 6]

function fmtTime(t: string): string {
  return t.slice(0, 5)
}

/**
 * A doctor's own weekly availability — self-service, mirroring the web
 * editor at /dashboard/doctor/availability. Both hit the same server
 * actions (lib/actions/doctor.ts), just through the mobile REST wrapper
 * at /api/mobile/v1/me/availability instead of a Next.js server action.
 */
export default function DoctorAvailability() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useMyAvailability()

  const rules = query.data?.rules ?? []
  const byDay = new Map<number, AvailabilityRule[]>()
  for (const day of DAYS) byDay.set(day, [])
  for (const rule of rules) byDay.get(rule.dayOfWeek)?.push(rule)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.md }}>
      <View
        style={{
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t.common.back} hitSlop={8}>
          <ChevronBack size={22} />
        </Pressable>
        <AppText variant="title" weight="heavy" style={{ flex: 1 }}>
          {t.availability.title}
        </AppText>
        <Pressable
          onPress={() => router.push("/practice/availability-form")}
          accessibilityRole="button"
          accessibilityLabel={t.availability.addNew}
          hitSlop={8}
        >
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}>
        <AppText variant="sub" color={colors.textMuted}>
          {t.availability.subtitle}
        </AppText>

        {query.isLoading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={{ height: 64, borderRadius: radius.xl }} />
            ))}
          </View>
        ) : query.isError ? (
          <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : rules.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t.availability.empty} body={t.availability.emptyBody} />
        ) : (
          <View style={{ gap: spacing.lg }}>
            {DAYS.map((day) => {
              const dayRules = byDay.get(day) ?? []
              if (dayRules.length === 0) return null
              return (
                <View key={day} style={{ gap: spacing.sm }}>
                  <AppText variant="sub" weight="bold" color={colors.textMuted}>
                    {t.availability.days[day]}
                  </AppText>
                  {dayRules.map((rule) => (
                    <AvailabilityRow key={rule.id} rule={rule} />
                  ))}
                </View>
              )
            })}
          </View>
        )}

        <Button
          label={t.availability.addNew}
          icon="add-outline"
          variant="secondary"
          onPress={() => router.push("/practice/availability-form")}
        />
      </ScrollView>
    </View>
  )
}

function AvailabilityRow({ rule }: { rule: AvailabilityRule }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    setBusy(true)
    try {
      await api.deleteAvailabilityRule(rule.id)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await queryClient.invalidateQueries({ queryKey: ["my-availability"] })
    } catch {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <Card
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        opacity: rule.active ? 1 : 0.6,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={rule.type === "VIDEO_CONSULTATION" ? "videocam-outline" : "medkit-outline"}
          size={18}
          color={colors.primary}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="bold" style={{ writingDirection: "ltr" }}>
          {fmtTime(rule.startTime)}–{fmtTime(rule.endTime)}
        </AppText>
        <AppText variant="caption" color={colors.textFaint}>
          {rule.type === "VIDEO_CONSULTATION" ? t.availability.video : t.availability.inPerson}
          {" · "}
          {rule.slotMinutes} {t.availability.minutesSuffix}
          {!rule.active && ` · ${t.availability.disabledTag}`}
        </AppText>
      </View>
      <Pressable
        onPress={() => router.push({ pathname: "/practice/availability-form", params: { id: rule.id } })}
        accessibilityRole="button"
        accessibilityLabel={t.availability.edit}
        hitSlop={8}
        style={{ padding: 4 }}
      >
        <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
      </Pressable>
      <Pressable
        onPress={() => {
          if (confirming) void onDelete()
          else {
            void Haptics.selectionAsync()
            setConfirming(true)
          }
        }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={confirming ? t.availability.confirmDelete : t.availability.delete}
        hitSlop={8}
        style={{ padding: 4 }}
      >
        <Ionicons name={confirming ? "checkmark-circle" : "trash-outline"} size={18} color={confirming ? colors.danger : colors.textMuted} />
      </Pressable>
    </Card>
  )
}
