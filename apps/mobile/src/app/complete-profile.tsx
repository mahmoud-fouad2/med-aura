import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText, Button, Card } from "../components/ui"
import { Field, FormError, inputStyle } from "../components/form"
import { CountryPicker } from "../components/country-picker"
import { api } from "../lib/api"
import { localizedApiError } from "../lib/request-errors"
import { useI18n } from "../lib/i18n"
import { colors, spacing } from "../theme"

/**
 * Landing screen for a first-time Google sign-in (see sign-in.tsx's
 * submitGoogle) — Google never collects a phone number or country, so this
 * fills the same two fields the email/password flow gets right after
 * signUp.email(), via the exact same completeSignupProfile action.
 */
export default function CompleteProfile() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (loading) return
    if (!phone.trim()) {
      setError(t.auth.phoneRequired)
      return
    }
    if (!country.trim()) {
      setError(t.auth.selectCountryRequired)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.completeSignupProfile({ accountType: "patient", phone, residenceCountry: country })
      router.replace("/(tabs)")
    } catch (err) {
      setError(localizedApiError(err, locale, {
        fallback: t.auth.genericError,
        offline: t.common.offline,
        timeout: t.common.timeout,
        validation: t.auth.profileValidationError,
        conflict: t.auth.profileConflictError,
        rateLimited: t.common.rateLimited,
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing.screen,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: spacing.xs, marginBottom: spacing.xl }}>
          <AppText variant="hero" weight="heavy" style={{ textAlign: "center" }}>
            {t.auth.completeProfileTitle}
          </AppText>
          <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
            {t.auth.completeProfileBody}
          </AppText>
        </View>

        <Card style={{ gap: spacing.lg }}>
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

          {error ? <FormError message={error} /> : null}

          <Button label={t.auth.continue} onPress={() => void submit()} loading={loading} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
