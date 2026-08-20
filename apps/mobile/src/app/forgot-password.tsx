import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native"
import { Link, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card } from "../components/ui"
import { authClient } from "../lib/auth-client"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"
import { Field, inputStyle } from "../components/form"

/**
 * Requesting a reset link needs no web-only capability (just an email
 * field + a Better Auth call) — there's no reason this should punt out to
 * the device browser like it did before. The link the email itself
 * contains still opens on the web (components/auth/forgot-password-form.tsx),
 * which is the normal, expected pattern for password-reset emails.
 */
export default function ForgotPassword() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit() {
    if (loading || !email.trim()) return
    setLoading(true)
    // Never reveal whether the email exists — always land on the same
    // "check your email" state, matching the web form's behavior.
    await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" }).catch(() => undefined)
    setLoading(false)
    setSent(true)
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
        <Card style={{ gap: spacing.lg, alignItems: sent ? "center" : undefined }}>
          {sent ? (
            <>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.lg,
                  backgroundColor: colors.successSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="mail-open-outline" size={26} color={colors.success} />
              </View>
              <AppText variant="hero" weight="heavy" style={{ textAlign: "center" }}>
                {t.auth.forgotSentTitle}
              </AppText>
              <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
                {t.auth.forgotSentBody}
              </AppText>
              <Button label={t.auth.backToSignIn} onPress={() => router.replace("/sign-in")} />
            </>
          ) : (
            <>
              <View style={{ gap: spacing.xs }}>
                <AppText variant="hero" weight="heavy">
                  {t.auth.forgotTitle}
                </AppText>
                <AppText variant="sub" color={colors.textMuted}>
                  {t.auth.forgotBody}
                </AppText>
              </View>
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
              <Button label={t.auth.forgotSend} onPress={() => void onSubmit()} loading={loading} disabled={!email.trim()} />
              <Link href="/sign-in" replace style={{ alignSelf: "center" }}>
                <AppText variant="sub" weight="bold" color={colors.primary}>
                  {t.auth.backToSignIn}
                </AppText>
              </Link>
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
