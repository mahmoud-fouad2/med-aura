import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native"
import { Link, router } from "expo-router"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as WebBrowser from "expo-web-browser"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Button,
  Card,
  ChevronBack,
  ChevronForward,
} from "../components/ui"
import { CountryPicker } from "../components/country-picker"
import { Field, FormError, inputStyle } from "../components/form"
import { brandAssets, Logo } from "../components/brand"
import { GoogleGlyph } from "../components/google-glyph"
import { authClient } from "../lib/auth-client"
import { api } from "../lib/api"
import { localizedApiError } from "../lib/request-errors"
import { registerForPushNotifications } from "../lib/push-notifications"
import { API_URL } from "../lib/config"
import { useI18n } from "../lib/i18n"
import { colors, radius, shadows, spacing } from "../theme"

type AccountType = "patient" | "doctor"

export default function SignUp() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState<string | null>(null)
  const [city, setCity] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Survives a failed profile save so retrying doesn't hit "email exists".
  const [accountCreated, setAccountCreated] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const submitGoogle = async () => {
    if (googleLoading) return
    setError(null)
    setGoogleLoading(true)
    // Public sign-up always creates a patient — the same invariant the
    // email/password form enforces. A doctor account still needs the full
    // accreditation application, which Google's profile can't supply.
    //
    // callbackURL is required so the in-app browser tab knows when to
    // auto-close and hand control back — without it the OAuth flow strands
    // the user on whatever web page it lands on. See sign-in.tsx.
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "medaura://" })
    if (error) {
      setGoogleLoading(false)
      setError(t.auth.genericError)
      return
    }
    const me = await api.me().catch(() => null)
    setGoogleLoading(false)
    void registerForPushNotifications()
    router.replace(me && !me.profileCompleted ? "/complete-profile" : "/(tabs)")
  }

  const submit = async () => {
    if (loading) return
    setError(null)
    if (!agree) {
      setError(t.auth.agreeRequired)
      return
    }
    if (!name.trim() || !email.trim() || !password) {
      setError(t.auth.requiredFields)
      return
    }
    if (password.length < 8) {
      setError(t.password.tooShort)
      return
    }
    if (!phone.trim()) {
      setError(t.auth.phoneRequired)
      return
    }
    if (!country) {
      setError(t.auth.selectCountryRequired)
      return
    }
    setLoading(true)

    if (!accountCreated) {
      const { error } = await authClient.signUp.email({ email, password, name })
      if (error) {
        setLoading(false)
        const m = (error.message ?? "").toLowerCase()
        setError(m.includes("exist") ? t.auth.emailExists : t.auth.genericError)
        return
      }
      setAccountCreated(true)
    }

    try {
      await api.completeSignupProfile({
        accountType: accountType ?? "patient",
        phone,
        residenceCountry: country,
        city: city || undefined,
        referralCode: referralCode.trim() || undefined,
      })
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
      return
    }
    setLoading(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (accountType === "doctor") {
      // The accreditation application (license, specialty) completes on the
      // secure web flow; the account itself is ready.
      void WebBrowser.openBrowserAsync(`${API_URL}/dashboard/provider/apply`)
    }
    void registerForPushNotifications()
    router.replace("/(tabs)")
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image
        source={brandAssets.authBg}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        contentFit="cover"
      />
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
        <View style={{ alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg }}>
          <Logo height={64} style={{ marginBottom: spacing.xs }} />
          <AppText variant="hero" weight="heavy">
            {t.auth.createTitle}
          </AppText>
          {accountType === null && (
            <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
              {t.auth.chooseType}
            </AppText>
          )}
        </View>

        <Pressable
          onPress={() => void submitGoogle()}
          disabled={googleLoading}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: 50,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: googleLoading ? 0.6 : 1,
            marginBottom: spacing.lg,
            ...shadows.card,
          }}
        >
          <GoogleGlyph size={18} />
          <AppText variant="body" weight="medium">
            {googleLoading ? t.common.loading : t.auth.continueWithGoogle}
          </AppText>
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <AppText variant="caption" color={colors.textFaint}>
            {t.auth.or}
          </AppText>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {accountType === null ? (
          <View style={{ gap: spacing.md }}>
            <TypeCard
              icon="heart"
              title={t.auth.patientTitle}
              body={t.auth.patientBody}
              onPress={() => setAccountType("patient")}
            />
            <TypeCard
              icon="medkit"
              title={t.auth.doctorTitle}
              body={t.auth.doctorBody}
              onPress={() => setAccountType("doctor")}
            />
            <View
              style={{
                backgroundColor: colors.primarySoft,
                borderRadius: radius.md,
                padding: spacing.md,
              }}
            >
              <AppText variant="caption" color={colors.textMuted}>
                {t.auth.reviewNote}
              </AppText>
            </View>
          </View>
        ) : (
          <Card style={{ gap: spacing.lg }}>
            <Pressable
              onPress={() => setAccountType(null)}
              accessibilityRole="button"
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <ChevronBack size={14} color={colors.primary} />
              <AppText variant="caption" weight="medium" color={colors.primary}>
                {accountType === "doctor" ? t.auth.doctorTitle : t.auth.patientTitle}
              </AppText>
            </Pressable>

            <Field label={t.auth.name}>
              <TextInput value={name} onChangeText={setName} style={inputStyle} autoComplete="name" />
            </Field>
            <Field label={t.auth.email}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={inputStyle}
                textAlign="left"
              />
            </Field>
            <Field label={t.auth.password}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                style={inputStyle}
                textAlign="left"
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
            <Field label={t.auth.city}>
              <TextInput value={city} onChangeText={setCity} style={inputStyle} />
            </Field>
            <Field label={t.auth.referralCode}>
              <TextInput
                value={referralCode}
                onChangeText={(v) => setReferralCode(v.toUpperCase())}
                autoCapitalize="characters"
                placeholder={t.auth.referralCodePlaceholder}
                placeholderTextColor={colors.textFaint}
                style={inputStyle}
                textAlign="left"
                maxLength={20}
              />
            </Field>

            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Switch
                value={agree}
                onValueChange={setAgree}
                accessibilityLabel={t.auth.agree}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agree }}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.onPrimary}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={colors.textMuted}>
                  {t.auth.agreePrefix}
                </AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <Pressable onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)} accessibilityRole="link">
                    <AppText variant="caption" weight="bold" color={colors.primary}>
                      {t.auth.termsLink}
                    </AppText>
                  </Pressable>
                  <Pressable onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)} accessibilityRole="link">
                    <AppText variant="caption" weight="bold" color={colors.primary}>
                      {t.auth.privacyLink}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>

            {error ? <FormError message={error} /> : null}

            <Button label={t.auth.signUp} onPress={() => void submit()} loading={loading} />
          </Card>
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginTop: spacing.xl,
          }}
        >
          <AppText variant="sub" color={colors.textMuted}>
            {t.auth.haveAccount}
          </AppText>
          <Link href="/sign-in" replace>
            <AppText variant="sub" weight="bold" color={colors.primary}>
              {t.auth.signIn}
            </AppText>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function TypeCard({
  icon,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  onPress: () => void
}) {
  return (
    <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="bold">
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {body}
        </AppText>
      </View>
      <ChevronForward size={18} />
    </Card>
  )
}
