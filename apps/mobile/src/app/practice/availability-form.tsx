import { useState } from "react"
import { Pressable, ScrollView, Switch, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, ChevronBack } from "../../components/ui"
import { api, useMyAvailability } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { Field } from "../sign-in"

type ConsultationType = "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"

const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90]

function timeOptions(): string[] {
  const out: string[] = []
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) continue
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    }
  }
  return out
}
const TIME_OPTIONS = timeOptions()

/** Create (no ?id) or edit (?id=...) one weekly availability rule. The edit
 *  case reads the row straight out of useMyAvailability's cache — same
 *  queryKey the list screen already populated — rather than a second
 *  "get one rule" endpoint that doesn't exist. */
export default function AvailabilityForm() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id?: string }>()
  const query = useMyAvailability()
  const existing = params.id ? query.data?.rules.find((r) => r.id === params.id) : undefined

  const [dayOfWeek, setDayOfWeek] = useState(existing?.dayOfWeek ?? 0)
  const [startTime, setStartTime] = useState(existing?.startTime.slice(0, 5) ?? "09:00")
  const [endTime, setEndTime] = useState(existing?.endTime.slice(0, 5) ?? "17:00")
  const [slotMinutes, setSlotMinutes] = useState(existing?.slotMinutes ?? 30)
  const [type, setType] = useState<ConsultationType>(
    (existing?.type as ConsultationType) ?? "VIDEO_CONSULTATION",
  )
  const [active, setActive] = useState(existing?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  async function onSave() {
    if (startTime >= endTime) {
      setError(t.availability.endBeforeStart)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.upsertAvailabilityRule({
        id: existing?.id,
        dayOfWeek,
        startTime,
        endTime,
        slotMinutes,
        type,
        active,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await queryClient.invalidateQueries({ queryKey: ["my-availability"] })
      router.back()
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : t.availability.saveError)
    }
  }

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
        <AppText variant="title" weight="heavy">
          {existing ? t.availability.editTitle : t.availability.newTitle}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}>
        <Card style={{ gap: spacing.lg }}>
          <Field label={t.availability.day}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {t.availability.days.map((label, day) => (
                <Chip key={day} label={label} selected={dayOfWeek === day} onPress={() => setDayOfWeek(day)} />
              ))}
            </View>
          </Field>

          <Field label={t.availability.from}>
            <TimeChipRow value={startTime} onChange={setStartTime} />
          </Field>
          <Field label={t.availability.to}>
            <TimeChipRow value={endTime} onChange={setEndTime} />
          </Field>

          <Field label={t.availability.slotDuration}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {SLOT_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  label={`${m} ${t.availability.minutesSuffix}`}
                  selected={slotMinutes === m}
                  onPress={() => setSlotMinutes(m)}
                />
              ))}
            </View>
          </Field>

          <Field label={t.availability.consultationType}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <TypeButton
                label={t.availability.video}
                icon="videocam-outline"
                selected={type === "VIDEO_CONSULTATION"}
                onPress={() => setType("VIDEO_CONSULTATION")}
              />
              <TypeButton
                label={t.availability.inPerson}
                icon="medkit-outline"
                selected={type === "IN_PERSON_CONSULTATION"}
                onPress={() => setType("IN_PERSON_CONSULTATION")}
              />
            </View>
          </Field>

          {existing && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Switch
                value={active}
                onValueChange={(v) => {
                  void Haptics.selectionAsync()
                  setActive(v)
                }}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
                accessibilityLabel={t.availability.active}
              />
              <AppText variant="sub" style={{ flex: 1 }}>
                {t.availability.active}
              </AppText>
            </View>
          )}

          {error ? (
            <AppText variant="sub" color={colors.danger}>
              {error}
            </AppText>
          ) : null}

          <Button label={t.availability.save} onPress={() => void onSave()} loading={busy} />
        </Card>
      </ScrollView>
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : "#FFFFFF",
      }}
    >
      <AppText variant="caption" weight={selected ? "bold" : "regular"} color={selected ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  )
}

function TypeButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : "#FFFFFF",
      }}
    >
      <Ionicons name={icon} size={16} color={selected ? colors.primary : colors.textMuted} />
      <AppText variant="caption" weight={selected ? "bold" : "regular"} color={selected ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  )
}

function TimeChipRow({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {TIME_OPTIONS.map((time) => (
        <Chip key={time} label={time} selected={value === time} onPress={() => onChange(time)} />
      ))}
    </ScrollView>
  )
}
