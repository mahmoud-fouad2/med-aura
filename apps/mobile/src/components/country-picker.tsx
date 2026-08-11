import { useState, useMemo, useCallback } from "react"
import {
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import { AppText } from "./ui"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

const FLAG_OFFSET_A = 0x1f1e6 - 65

function isoToFlag(code: string): string {
  const cp1 = code.codePointAt(0)! + FLAG_OFFSET_A
  const cp2 = code.codePointAt(1)! + FLAG_OFFSET_A
  return String.fromCodePoint(cp1, cp2)
}

type CountryItem = { code: string; label: string; flag: string }

export function CountryPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (code: string) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const insets = useSafeAreaInsets()

  const countries = useMemo<CountryItem[]>(
    () =>
      Object.entries(t.countries).map(([code, label]) => ({
        code,
        label,
        flag: isoToFlag(code),
      })),
    [t.countries],
  )

  const filtered = useMemo(() => {
    if (!search) return countries
    const q = search.toLowerCase()
    return countries.filter(
      (c) => c.label.includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [countries, search])

  const selected = countries.find((c) => c.code === value)

  const handleSelect = useCallback(
    (code: string) => {
      void Haptics.selectionAsync()
      onChange(code)
      setOpen(false)
      setSearch("")
    },
    [onChange],
  )

  const renderItem = useCallback(
    ({ item }: { item: CountryItem }) => (
      <Pressable
        onPress={() => handleSelect(item.code)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: pressed
            ? colors.primarySoft
            : item.code === value
              ? colors.primarySoft
              : "transparent",
        })}
      >
        <AppText style={{ fontSize: 26 }}>{item.flag}</AppText>
        <AppText
          variant="body"
          weight={item.code === value ? "bold" : "regular"}
          color={item.code === value ? colors.primary : colors.text}
          style={{ flex: 1 }}
        >
          {item.label}
        </AppText>
        {item.code === value && (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        )}
      </Pressable>
    ),
    [value, handleSelect],
  )

  return (
    <>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync()
          setOpen(true)
        }}
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
        {selected ? (
          <>
            <AppText style={{ fontSize: 22 }}>{selected.flag}</AppText>
            <AppText variant="body" weight="medium" style={{ flex: 1 }}>
              {selected.label}
            </AppText>
          </>
        ) : (
          <AppText
            variant="body"
            color={colors.textFaint}
            style={{ flex: 1 }}
          >
            {t.auth.selectCountry}
          </AppText>
        )}
        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setOpen(false)
          setSearch("")
        }}
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
            <Pressable
              onPress={() => {
                setOpen(false)
                setSearch("")
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <AppText variant="title" weight="heavy" style={{ flex: 1 }}>
              {t.auth.country}
            </AppText>
          </View>

          <View style={{ paddingHorizontal: spacing.screen, paddingBottom: spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                paddingHorizontal: spacing.md,
              }}
            >
              <Ionicons name="search" size={18} color={colors.textFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t.auth.searchCountry}
                placeholderTextColor={colors.textFaint}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: colors.text,
                  paddingVertical: spacing.md,
                  writingDirection: "auto",
                }}
                autoFocus
              />
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginHorizontal: spacing.lg,
                }}
              />
            )}
          />
        </View>
      </Modal>
    </>
  )
}
