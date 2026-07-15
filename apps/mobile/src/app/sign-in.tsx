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
import * as WebBrowser from "expo-web-browser"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card } from "../components/ui"
import { brandAssets, Logo } from "../components/brand"
import { authClient } from "../lib/auth-client"
import { API_URL } from "../lib/config"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

export default function SignIn() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    router.replace("/(tabs)")
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
        style={{ position: "absolute", width: "100%", height: "100%" }}
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
        <View style={{ alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl }}>
          <Logo height={54} style={{ marginBottom: spacing.sm }} />
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

          <Button label={t.auth.signIn} onPress={() => void submit()} loading={loading} />

          <Pressable
            onPress={() =>
              void WebBrowser.openBrowserAsync(`${API_URL}/forgot-password`)
            }
            style={{ alignSelf: "center" }}
          >
            <AppText variant="sub" weight="medium" color={colors.primary}>
              {t.auth.forgot}
            </AppText>
          </Pressable>
        </Card>

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

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="sub" weight="medium">
        {label}
      </AppText>
      {children}
    </View>
  )
}

export const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: colors.text,
  backgroundColor: "#FFFFFF",
} as const
