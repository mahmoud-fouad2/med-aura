import { useState } from "react"
import { Modal, Platform, Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker"
import { AppText, Button } from "./ui"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

const MIN_DATE = new Date(1920, 0, 1)

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fromDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Value/onChange are plain "YYYY-MM-DD" strings (same wire format the API
 * already expects) — the native Date object stays entirely internal.
 * Replaces free-text date typing, which patients kept entering wrong.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(value ? fromDateString(value) : new Date(2000, 0, 1))

  const today = new Date()
  const selected = value ? fromDateString(value) : null
  const label = selected
    ? selected.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  function openPicker() {
    void Haptics.selectionAsync()
    setDraft(selected ?? new Date(2000, 0, 1))
    setOpen(true)
  }

  function handleAndroidChange(event: DateTimePickerEvent, picked?: Date) {
    setOpen(false)
    if (event.type === "set" && picked) onChange(toDateString(picked))
  }

  function handleIosChange(_event: DateTimePickerEvent, picked?: Date) {
    if (picked) setDraft(picked)
  }

  function confirmIos() {
    onChange(toDateString(draft))
    setOpen(false)
  }

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          minHeight: 48,
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        <AppText
          variant="body"
          weight={label ? "medium" : "regular"}
          color={label ? colors.text : colors.textFaint}
          style={{ flex: 1 }}
        >
          {label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {open && Platform.OS === "android" && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          maximumDate={today}
          minimumDate={MIN_DATE}
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal
          visible={open}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              paddingTop: insets.top || spacing.lg,
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
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
              <AppText variant="title" weight="heavy" style={{ flex: 1 }}>
                {t.editProfile.selectDate}
              </AppText>
            </View>

            <View style={{ alignItems: "center" }}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                maximumDate={today}
                minimumDate={MIN_DATE}
                onChange={handleIosChange}
                locale={locale === "ar" ? "ar" : "en"}
                style={{ width: "100%" }}
              />
            </View>

            <View
              style={{
                paddingHorizontal: spacing.screen,
                paddingBottom: insets.bottom + spacing.lg,
                paddingTop: spacing.md,
              }}
            >
              <Button label={t.common.confirm} onPress={confirmIos} />
            </View>
          </View>
        </Modal>
      )}
    </>
  )
}
