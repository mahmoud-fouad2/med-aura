import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { Link, router } from "expo-router"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card } from "../components/ui"
import { Field, FormError, inputStyle } from "../components/form"
import { brandAssets, Logo } from "../components/brand"
import { GoogleGlyph } from "../components/google-glyph"
import { authClient } from "../lib/auth-client"
import { setRememberMe } from "../lib/session-prefs"
import { registerForPushNotifications } from "../lib/push-notifications"
import { api } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, shadows, spacing } from "../theme"

export default function SignIn() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const submit = async () => {
    if (loading) return
    setError(null)
    setLoading(true)
    const { error } = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (error) {
      const m = (error.message ?? "").toLowerCase()
      setError(
        m.includes("invalid") || m.includes("credential")
          ? t.auth.invalidCredentials
          : t.auth.genericError,
      )
      return
    }
    await setRememberMe(remember).catch(() => undefined)
    void registerForPushNotifications()
    router.replace("/(tabs)")
  }

  const submitGoogle = async () => {
    if (googleLoading) return
    setError(null)
    setGoogleLoading(true)
    // The Expo plugin opens an in-app browser tab for the OAuth round trip —
    // but only auto-closes and hands control back to the app once it sees a
    // navigation to `callbackURL`. Without it, the browser has nothing to
    // watch for and the user is left stranded on whatever page Google's
    // flow lands on instead of returning to the app.
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "medaura://" })
    if (error) {
      setGoogleLoading(false)
      setError(t.auth.genericError)
      return
    }
    await setRememberMe(remember).catch(() => undefined)
    // Google never collects a phone/country — a first-time sign-up detours
    // through the same completion screen the email flow fills right after
    // signUp.email(), just triggered here instead.
    const me = await api.me().catch(() => null)
    setGoogleLoading(false)
    void registerForPushNotifications()
    router.replace(me && !me.profileCompleted ? "/complete-profile" : "/(tabs)")
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Soft brand wash behind the form — the screen reads as part of the
          product, not a bare web form on white. */}
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
        <View style={{ alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
          <Logo height={72} />
          <AppText variant="hero" weight="heavy">
            {t.auth.welcomeTitle}
          </AppText>
          <AppText variant="sub" color={colors.textMuted}>
            {t.auth.welcomeBody}
          </AppText>
        </View>

        <Card style={{ gap: spacing.lg }}>
          <Field label={t.auth.email}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={inputStyle}
              textAlign="left"
            />
          </Field>

          <Field label={t.auth.password}>
            <View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                style={inputStyle}
                textAlign="left"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t.password.hide : t.password.show}
                hitSlop={10}
                style={{ position: "absolute", end: 12, top: 12 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textFaint}
                />
              </Pressable>
            </View>
          </Field>

          {error ? <FormError message={error} /> : null}

          {/* Remember-me sits opposite the forgot link, both above the CTA. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => setRemember((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: remember }}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  borderWidth: remember ? 0 : 1.5,
                  borderColor: colors.border,
                  backgroundColor: remember ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {remember ? (
                    <Ionicons name="checkmark" size={15} color={colors.onPrimary} />
                ) : null}
              </View>
              <AppText variant="sub" color={colors.textMuted}>
                {t.auth.rememberMe}
              </AppText>
            </Pressable>

            <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8}>
              <AppText variant="sub" weight="medium" color={colors.primary}>
                {t.auth.forgot}
              </AppText>
            </Pressable>
          </View>

          <Button label={t.auth.signIn} onPress={() => void submit()} loading={loading} />
        </Card>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            marginVertical: spacing.lg,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <AppText variant="caption" color={colors.textFaint}>
            {t.auth.or}
          </AppText>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
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
            justifyContent: "center",
            gap: 6,
            marginTop: spacing.xl,
          }}
        >
          <AppText variant="sub" color={colors.textMuted}>
            {t.auth.noAccount}
          </AppText>
          <Link href="/sign-up" replace>
            <AppText variant="sub" weight="bold" color={colors.primary}>
              {t.auth.signUp}
            </AppText>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
