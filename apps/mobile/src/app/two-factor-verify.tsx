import { useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, ChevronBack } from "../components/ui"
import { Field, FormError, inputStyle } from "../components/form"
import { authClient } from "../lib/auth-client"
import { setRememberMe } from "../lib/session-prefs"
import { registerForPushNotifications } from "../lib/push-notifications"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

type Method = "otp" | "totp" | "backup"

/**
 * Pushed from sign-in.tsx once signIn.email() reports twoFactorRedirect —
 * the credential was right, but the account has a second factor enabled.
 * `methods` (comma-joined in the URL) is exactly what the server says this
 * account can complete right now, never a hardcoded guess.
 */
export default function TwoFactorVerify() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const { methods: methodsParam, remember: rememberParam } = useLocalSearchParams<{
    methods: string
    remember?: string
  }>()
  const methods = (methodsParam ?? "").split(",").filter(Boolean)
  const hasOtp = methods.includes("otp")
  const hasTotp = methods.includes("totp")

  const [method, setMethod] = useState<Method>(hasOtp ? "otp" : "totp")
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [busy, setBusy] = useState(false)
  // Starts true when the initial method is already "otp" (lazy init — not a
  // setState call inside the effect below), so the very first send on mount
  // is covered without the effect needing to flip it on synchronously.
  const [sendingOtp, setSendingOtp] = useState(hasOtp)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (method !== "otp") return
    authClient.twoFactor
      .sendOtp()
      .catch(() => undefined)
      .finally(() => setSendingOtp(false))
  }, [method])

  function switchMethod(next: Method) {
    setMethod(next)
    setCode("")
    setError(null)
    setResent(false)
    if (next === "otp") setSendingOtp(true)
  }

  async function handleResend() {
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.sendOtp()
    setBusy(false)
    if (err) {
      setError(t.security.error)
      return
    }
    setResent(true)
  }

  async function handleVerify() {
    if (!code.trim()) return
    setBusy(true)
    setError(null)

    const call =
      method === "otp"
        ? authClient.twoFactor.verifyOtp({ code: code.trim(), trustDevice })
        : method === "totp"
          ? authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice })
          : authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice })

    const { error: err } = await call
    if (err) {
      setBusy(false)
      setError(err.status === 429 ? t.security.tooManyAttempts : t.security.invalidCode)
      return
    }
    await setRememberMe(rememberParam === "1").catch(() => undefined)
    void registerForPushNotifications()
    router.replace("/(tabs)")
  }

  const icon = method === "otp" ? "mail-outline" : method === "totp" ? "phone-portrait-outline" : "key-outline"
  const subtitle =
    method === "otp"
      ? t.security.verifySubtitleOtp
      : method === "totp"
        ? t.security.verifySubtitleTotp
        : t.security.verifySubtitleBackup

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
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={26} color={colors.primary} />
          </View>
          <AppText variant="hero" weight="heavy">
            {t.security.verifyTitle}
          </AppText>
          <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
            {subtitle}
          </AppText>
        </View>

        <Card style={{ gap: spacing.lg }}>
          <Field label={method === "backup" ? t.security.backupLabel : t.security.codeLabel}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(method === "backup" ? v : v.replace(/\D/g, ""))}
              keyboardType={method === "backup" ? "default" : "number-pad"}
              maxLength={method === "backup" ? 12 : 6}
              autoFocus
              editable={!sendingOtp}
              style={[inputStyle, { textAlign: "center", letterSpacing: 6, fontSize: 18 }]}
            />
          </Field>

          {method === "otp" && (
            <Pressable onPress={() => void handleResend()} disabled={busy || sendingOtp} hitSlop={8}>
              <AppText variant="sub" weight="medium" color={colors.primary} style={{ opacity: busy || sendingOtp ? 0.6 : 1 }}>
                {resent ? t.security.resent : t.security.resend}
              </AppText>
            </Pressable>
          )}

          <Pressable
            onPress={() => setTrustDevice((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: trustDevice }}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                borderWidth: trustDevice ? 0 : 1.5,
                borderColor: colors.border,
                backgroundColor: trustDevice ? colors.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {trustDevice ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}
            </View>
            <AppText variant="sub" color={colors.textMuted}>
              {t.security.trustDevice}
            </AppText>
          </Pressable>

          {error ? <FormError message={error} /> : null}

          <Button
            label={t.security.verify}
            onPress={() => void handleVerify()}
            loading={busy}
            disabled={sendingOtp || !code.trim()}
          />

          <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
            {method !== "otp" && hasOtp && (
              <Pressable onPress={() => switchMethod("otp")} hitSlop={8}>
                <AppText variant="caption" weight="medium" color={colors.primary}>
                  {t.security.useOtp}
                </AppText>
              </Pressable>
            )}
            {method !== "totp" && hasTotp && (
              <Pressable onPress={() => switchMethod("totp")} hitSlop={8}>
                <AppText variant="caption" weight="medium" color={colors.primary}>
                  {t.security.useTotp}
                </AppText>
              </Pressable>
            )}
            {method !== "backup" && (
              <Pressable onPress={() => switchMethod("backup")} hitSlop={8}>
                <AppText variant="caption" color={colors.textFaint}>
                  {t.security.useBackup}
                </AppText>
              </Pressable>
            )}
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
