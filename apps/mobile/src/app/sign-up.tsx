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
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as WebBrowser from "expo-web-browser"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card } from "../components/ui"
import { authClient } from "../lib/auth-client"
import { api } from "../lib/api"
import { API_URL } from "../lib/config"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"
import { Field, inputStyle } from "./sign-in"

type AccountType = "patient" | "doctor"

export default function SignUp() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState<string | null>(null)
  const [city, setCity] = useState("")
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Survives a failed profile save so retrying doesn't hit "email exists".
  const [accountCreated, setAccountCreated] = useState(false)

  const submit = async () => {
    if (loading) return
    setError(null)
    if (!agree) {
      setError(t.auth.agreeRequired)
      return
    }
    if (!country) {
      setError(t.auth.country)
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
      })
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : t.auth.genericError)
      return
    }
    setLoading(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (accountType === "doctor") {
      // The accreditation application (license, specialty) completes on the
      // secure web flow; the account itself is ready.
      void WebBrowser.openBrowserAsync(`${API_URL}/dashboard/provider/apply`)
    }
    router.replace("/(tabs)")
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
          <AppText variant="hero" weight="heavy">
            {t.auth.createTitle}
          </AppText>
          {accountType === null && (
            <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
              {t.auth.chooseType}
            </AppText>
          )}
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
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {Object.entries(t.countries).map(([code, label]) => (
                  <Pressable
                    key={code}
                    onPress={() => {
                      void Haptics.selectionAsync()
                      setCountry(code)
                    }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 7,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: country === code ? colors.primary : colors.border,
                      backgroundColor: country === code ? colors.primarySoft : "#FFFFFF",
                    }}
                  >
                    <AppText
                      variant="caption"
                      weight={country === code ? "bold" : "regular"}
                      color={country === code ? colors.primary : colors.textMuted}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Field label={t.auth.city}>
              <TextInput value={city} onChangeText={setCity} style={inputStyle} />
            </Field>

            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Switch
                value={agree}
                onValueChange={setAgree}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
              />
              <Pressable
                style={{ flex: 1 }}
                onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)}
              >
                <AppText variant="caption" color={colors.textMuted}>
                  {t.auth.agree}
                </AppText>
              </Pressable>
            </View>

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
      <Ionicons name="chevron-back" size={18} color={colors.textFaint} />
    </Card>
  )
}
