import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import * as Haptics from "expo-haptics"
import {
  AppText,
  Button,
  Card,
  ChevronBack,
  Skeleton,
} from "../components/ui"
import { useMe, api, type Me } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"
import { Field, inputStyle } from "./sign-in"

/** Own-profile editing, fully in-app — no browser hand-off. */
export default function EditProfile() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const me = useMe()

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          hitSlop={8}
        >
          <ChevronBack size={22} />
        </Pressable>
        <AppText variant="title" weight="heavy">
          {t.profile.editProfile}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {!me.data ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton style={{ width: "45%" }} />
            <Skeleton style={{ height: 44, borderRadius: radius.md }} />
            <Skeleton style={{ width: "45%" }} />
            <Skeleton style={{ height: 44, borderRadius: radius.md }} />
          </Card>
        ) : (
          // Mounted only once the profile is loaded, so state initialises
          // from real values — later refetches never clobber typing.
          <ProfileForm initial={me.data} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function ProfileForm({ initial }: { initial: Me }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [name, setName] = useState(initial.name ?? "")
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [country, setCountry] = useState<string | null>(
    initial.residenceCountry ?? null,
  )
  const [city, setCity] = useState(initial.city ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (saving) return
    setError(null)
    if (!country) {
      setError(t.auth.country)
      return
    }
    setSaving(true)
    try {
      await api.updateMe({
        name,
        phone,
        residenceCountry: country,
        city: city || undefined,
      })
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error && err.message ? err.message : t.auth.genericError)
      return
    }
    // The name/phone shown on home + profile come from these queries.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["home"] }),
    ])
    setSaving(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  return (
    <Card style={{ gap: spacing.lg }}>
      <Field label={t.auth.name}>
        <TextInput
          value={name}
          onChangeText={setName}
          style={inputStyle}
          autoComplete="name"
        />
      </Field>
      <Field label={t.auth.phone}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="+9665xxxxxxxx"
          placeholderTextColor={colors.textFaint}
          style={inputStyle}
          textAlign="left"
        />
      </Field>
      <Field label={t.auth.country}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {Object.entries(t.countries).map(([code, label]) => (
            <Pressable
              key={code}
              onPress={() => {
                void Haptics.selectionAsync()
                setCountry(code)
              }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 7,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: country === code ? colors.primary : colors.border,
                backgroundColor: country === code ? colors.primarySoft : "#FFFFFF",
              }}
            >
              <AppText
                variant="caption"
                weight={country === code ? "bold" : "regular"}
                color={country === code ? colors.primary : colors.textMuted}
              >
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Field>
      <Field label={t.auth.city}>
        <TextInput value={city} onChangeText={setCity} style={inputStyle} />
      </Field>

      {error ? (
        <View
          style={{
            backgroundColor: colors.dangerSoft,
            borderRadius: radius.md,
            padding: spacing.md,
          }}
        >
          <AppText variant="sub" color={colors.danger}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button
        label={t.editProfile.save}
        onPress={() => void submit()}
        loading={saving}
      />
    </Card>
  )
}
