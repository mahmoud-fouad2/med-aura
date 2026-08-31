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
  Chip,
  ChevronBack,
  SectionHeading,
  Skeleton,
} from "../components/ui"
import { CountryPicker } from "../components/country-picker"
import { DatePicker } from "../components/date-picker"
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
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | null>(
    initial.biologicalSex ?? null,
  )
  const [heightCm, setHeightCm] = useState(
    initial.heightCm != null ? String(initial.heightCm) : "",
  )
  const [weightKg, setWeightKg] = useState(
    initial.weightKg != null ? String(initial.weightKg) : "",
  )
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
      const height = Number(heightCm)
      const weight = Number(weightKg)
      await api.updateMe({
        name,
        phone,
        residenceCountry: country,
        city: city || undefined,
        nationality: nationality || undefined,
        dateOfBirth: dateOfBirth || undefined,
        biologicalSex: biologicalSex || undefined,
        heightCm: heightCm.trim() && Number.isFinite(height) ? height : undefined,
        weightKg: weightKg.trim() && Number.isFinite(weight) ? weight : undefined,
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
      <Field label={t.editProfile.dateOfBirth}>
        <DatePicker
          value={dateOfBirth}
          onChange={setDateOfBirth}
          placeholder={t.editProfile.dateOfBirthHint}
        />
      </Field>

      <SectionHeading
        icon="body-outline"
        title={t.editProfile.physicalSectionTitle}
      />
      <Field label={t.editProfile.biologicalSex} hint={t.editProfile.physicalSectionHint}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Chip
            label={t.editProfile.male}
            active={biologicalSex === "male"}
            onPress={() => setBiologicalSex("male")}
          />
          <Chip
            label={t.editProfile.female}
            active={biologicalSex === "female"}
            onPress={() => setBiologicalSex("female")}
          />
        </View>
      </Field>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field label={t.editProfile.heightCm}>
            <TextInput
              value={heightCm}
              onChangeText={(v) => setHeightCm(v.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              maxLength={3}
              style={inputStyle}
              textAlign="left"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t.editProfile.weightKg}>
            <TextInput
              value={weightKg}
              onChangeText={(v) => setWeightKg(v.replace(/[^\d.]/g, ""))}
              keyboardType="decimal-pad"
              maxLength={5}
              style={inputStyle}
              textAlign="left"
            />
          </Field>
        </View>
      </View>

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
