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
  SectionHeading,
  Skeleton,
} from "../components/ui"
import { CountryPicker } from "../components/country-picker"
import { Field, inputStyle } from "../components/form"
import { useMe, api, type Me } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { queryKeys } from "../lib/query-keys"
import { localizedApiError } from "../lib/request-errors"
import { colors, radius, spacing } from "../theme"

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
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()

  const [name, setName] = useState(initial.name ?? "")
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [country, setCountry] = useState<string | null>(
    initial.residenceCountry ?? null,
  )
  const [city, setCity] = useState(initial.city ?? "")
  const [nationality, setNationality] = useState<string | null>(
    initial.nationality ?? null,
  )
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth ?? "")
  const [emergencyName, setEmergencyName] = useState(
    initial.emergencyContactName ?? "",
  )
  const [emergencyPhone, setEmergencyPhone] = useState(
    initial.emergencyContactPhone ?? "",
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (saving) return
    setError(null)
    if (!country) {
      setError(t.auth.selectCountryRequired)
      return
    }
    setSaving(true)
    try {
      await api.updateMe({
        name,
        phone,
        residenceCountry: country,
        city: city || undefined,
        nationality: nationality || undefined,
        dateOfBirth: dateOfBirth || undefined,
        emergencyContactName: emergencyName || undefined,
        emergencyContactPhone: emergencyPhone || undefined,
      })
    } catch (err) {
      setSaving(false)
      setError(localizedApiError(err, locale, {
        fallback: t.auth.genericError,
        offline: t.common.offline,
        timeout: t.common.timeout,
        validation: t.auth.profileValidationError,
        conflict: t.auth.profileConflictError,
        rateLimited: t.common.rateLimited,
      }))
      return
    }
    // The name/phone shown on home + profile come from these queries.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.me }),
      queryClient.invalidateQueries({ queryKey: queryKeys.home }),
    ])
    setSaving(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  return (
    <Card style={{ gap: spacing.lg }}>
      <SectionHeading icon="person-outline" title={t.editProfile.sectionTitle} />
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
        <CountryPicker value={country} onChange={setCountry} />
      </Field>
      <Field label={t.editProfile.nationality}>
        <CountryPicker value={nationality} onChange={setNationality} />
      </Field>
      <Field label={t.auth.city}>
        <TextInput value={city} onChangeText={setCity} style={inputStyle} />
      </Field>
      <Field label={t.editProfile.dateOfBirth} hint={t.editProfile.dateOfBirthHint}>
        <TextInput
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textFaint}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          style={inputStyle}
          textAlign="left"
        />
      </Field>

      <SectionHeading
        icon="call-outline"
        title={t.editProfile.emergencySectionTitle}
      />
      <Field label={t.editProfile.emergencyContactName}>
        <TextInput
          value={emergencyName}
          onChangeText={setEmergencyName}
          style={inputStyle}
          autoComplete="name"
        />
      </Field>
      <Field label={t.editProfile.emergencyContactPhone}>
        <TextInput
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          keyboardType="phone-pad"
          placeholder="+9665xxxxxxxx"
          placeholderTextColor={colors.textFaint}
          style={inputStyle}
          textAlign="left"
        />
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
