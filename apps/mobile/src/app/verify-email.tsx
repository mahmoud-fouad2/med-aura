import { useState } from "react"
import { View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText, Button, Card, IconBadge } from "../components/ui"
import { FormError } from "../components/form"
import { authClient } from "../lib/auth-client"
import { useI18n } from "../lib/i18n"
import { colors, spacing } from "../theme"

export default function VerifyEmail() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ email?: string }>()
  const email = typeof params.email === "string" ? params.email : ""
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resend() {
    if (!email || loading) return
    setLoading(true)
    setError(null)
    const { error: sendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "medaura://sign-in?verified=1",
    })
    setLoading(false)
    if (sendError) {
      setError(t.auth.genericError)
      return
    }
    setSent(true)
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        backgroundColor: colors.background,
        paddingHorizontal: spacing.screen,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <Card style={{ alignItems: "center", gap: spacing.lg }}>
        <IconBadge icon="mail-open-outline" size={56} />
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <AppText variant="title" weight="heavy" style={{ textAlign: "center" }}>
            {t.auth.verifyEmailTitle}
          </AppText>
          <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
            {t.auth.verifyEmailBody}
          </AppText>
          {email ? (
            <AppText variant="sub" weight="medium" style={{ writingDirection: "ltr" }} selectable>
              {email}
            </AppText>
          ) : null}
        </View>
        {sent ? (
          <AppText variant="sub" color={colors.success} style={{ textAlign: "center" }}>
            {t.auth.verificationSent}
          </AppText>
        ) : null}
        {error ? <FormError message={error} /> : null}
        <View style={{ width: "100%", gap: spacing.sm }}>
          <Button
            label={t.auth.resendVerification}
            variant="secondary"
            loading={loading}
            disabled={!email}
            onPress={() => void resend()}
          />
          <Button label={t.auth.backToSignIn} onPress={() => router.replace("/sign-in")} />
        </View>
      </Card>
    </View>
  )
}
