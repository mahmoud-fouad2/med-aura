import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, Chip } from "../components/ui"
import { Field, FormError, inputStyle } from "../components/form"
import { CountryPicker } from "../components/country-picker"
import { DatePicker } from "../components/date-picker"
import { api, useMe } from "../lib/api"
import { localizedApiError } from "../lib/request-errors"
import { useI18n } from "../lib/i18n"
import { clearPendingReferralCode, getPendingReferralCode } from "../lib/pending-referral"
import { colors, radius, spacing } from "../theme"

type Step = "contact" | "about"

/**
 * Two-step onboarding wizard — mirrors the web /complete-profile flow.
 * Reached from three places: a first-time Google sign-up/sign-in (phone and
 * country were never collected, so both steps show), and — via the (tabs)
 * home screen's own redirect — any patient, new or pre-existing, who has
 * never seen the "about yourself" step.
 */
export default function CompleteProfile() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const me = useMe()
  const [step, setStep] = useState<Step | null>(null)

  // Resolve the starting step once /me loads — a fresh Google sign-up still
  // needs phone/country; anyone who already has them jumps straight to "about".
  if (step === null && me.data) {
    setStep(me.data.profileCompleted ? "about" : "contact")
  }

  if (!me.data || step === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <AppText variant="sub" color={colors.textMuted}>
          {t.common.loading}
        </AppText>
      </View>
    )
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
        {!me.data.profileCompleted && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: spacing.lg }}>
            {(["contact", "about"] as const).map((s) => (
              <View
                key={s}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: s === step ? 24 : 6,
                  backgroundColor: s === step ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        )}

        {step === "contact" ? (
          <ContactStep
            key="contact"
            onDone={() => setStep("about")}
          />
        ) : (
          <AboutStep key="about" />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function ContactStep({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n()
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
      const referralCode = await getPendingReferralCode().catch(() => undefined)
      await api.completeSignupProfile({
        accountType: "patient",
        phone,
        residenceCountry: country,
        referralCode,
      })
      await clearPendingReferralCode().catch(() => undefined)
      onDone()
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
    <Animated.View entering={FadeIn.duration(300)}>
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
    </Animated.View>
  )
}

function AboutStep() {
  const { t, locale } = useI18n()
  const [dob, setDob] = useState("")
  const [sex, setSex] = useState<"male" | "female" | null>(null)
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const finish = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    const h = Number(height)
    const w = Number(weight)
    try {
      await api.saveProfileWizardDetails({
        dateOfBirth: dob || undefined,
        biologicalSex: sex ?? undefined,
        heightCm: height.trim() && Number.isFinite(h) ? h : undefined,
        weightKg: weight.trim() && Number.isFinite(w) ? w : undefined,
      })
      router.replace("/(tabs)")
    } catch (err) {
      setLoading(false)
      setError(localizedApiError(err, locale, {
        fallback: t.auth.genericError,
        offline: t.common.offline,
        timeout: t.common.timeout,
        validation: t.auth.profileValidationError,
        conflict: t.auth.profileConflictError,
        rateLimited: t.common.rateLimited,
      }))
    }
  }

  const skip = async () => {
    if (loading) return
    setLoading(true)
    await api.skipProfileWizard().catch(() => undefined)
    router.replace("/(tabs)")
  }

  return (
    <Animated.View entering={SlideInRight.duration(320)} exiting={SlideOutLeft.duration(220)}>
      <View style={{ alignItems: "center", gap: spacing.xs, marginBottom: spacing.xl }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.xs,
          }}
        >
          <Ionicons name="heart-half-outline" size={24} color={colors.primary} />
        </View>
        <AppText variant="hero" weight="heavy" style={{ textAlign: "center" }}>
          {t.editProfile.aboutWizardTitle}
        </AppText>
        <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
          {t.editProfile.aboutWizardBody}
        </AppText>
      </View>

      <Card style={{ gap: spacing.lg }}>
        <Field label={t.editProfile.dateOfBirth}>
          <DatePicker value={dob} onChange={setDob} placeholder={t.editProfile.dateOfBirthHint} />
        </Field>

        <Field label={t.editProfile.biologicalSex}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Chip label={t.editProfile.male} active={sex === "male"} onPress={() => setSex("male")} />
            <Chip label={t.editProfile.female} active={sex === "female"} onPress={() => setSex("female")} />
          </View>
        </Field>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Field label={t.editProfile.heightCm}>
              <TextInput
                value={height}
                onChangeText={(v) => setHeight(v.replace(/[^\d]/g, ""))}
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
                value={weight}
                onChangeText={(v) => setWeight(v.replace(/[^\d.]/g, ""))}
                keyboardType="decimal-pad"
                maxLength={5}
                style={inputStyle}
                textAlign="left"
              />
            </Field>
          </View>
        </View>

        {error ? <FormError message={error} /> : null}

        <Button label={t.editProfile.finishWizard} onPress={() => void finish()} loading={loading} />
        <Pressable onPress={() => void skip()} disabled={loading} hitSlop={8} style={{ alignSelf: "center" }}>
          <AppText variant="sub" weight="medium" color={colors.textMuted}>
            {t.editProfile.skipWizard}
          </AppText>
        </Pressable>
      </Card>
    </Animated.View>
  )
}
