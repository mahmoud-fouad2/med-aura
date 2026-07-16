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
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { AppText, Button, Card, ChevronBack } from "../components/ui"
import { authClient } from "../lib/auth-client"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"
import { Field, inputStyle } from "./sign-in"

/**
 * In-app password change via the platform's own auth endpoint — requires the
 * current password, and can end every other session at the same time.
 */
export default function ChangePassword() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()

  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [revokeOthers, setRevokeOthers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (saving) return
    setError(null)
    if (next.length < 8) {
      setError(t.password.tooShort)
      return
    }
    if (next !== confirm) {
      setError(t.password.mismatch)
      return
    }
    setSaving(true)
    const { error: apiError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: revokeOthers,
    })
    setSaving(false)
    if (apiError) {
      const m = (apiError.message ?? "").toLowerCase()
      setError(
        m.includes("password") || m.includes("invalid")
          ? t.password.wrongCurrent
          : t.auth.genericError,
      )
      return
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setDone(true)
  }

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
          {t.profile.changePassword}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: spacing.lg }}>
          {done ? (
            <>
              <View
                style={{
                  backgroundColor: colors.successSoft,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <AppText variant="sub" color={colors.success}>
                  {t.password.changed}
                </AppText>
              </View>
              <Button label={t.common.back} onPress={() => router.back()} />
            </>
          ) : (
            <>
              <Field label={t.password.current}>
                <TextInput
                  value={current}
                  onChangeText={setCurrent}
                  secureTextEntry
                  autoComplete="current-password"
                  style={inputStyle}
                  textAlign="left"
                />
              </Field>
              <Field label={t.password.new}>
                <TextInput
                  value={next}
                  onChangeText={setNext}
                  secureTextEntry
                  autoComplete="new-password"
                  style={inputStyle}
                  textAlign="left"
                />
              </Field>
              <Field label={t.password.confirm}>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoComplete="new-password"
                  style={inputStyle}
                  textAlign="left"
                />
              </Field>

              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <Switch
                  value={revokeOthers}
                  onValueChange={setRevokeOthers}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={t.password.revokeOthers}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="sub">{t.password.revokeOthers}</AppText>
                  <AppText variant="caption" color={colors.textFaint}>
                    {t.password.revokeOthersHint}
                  </AppText>
                </View>
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

              <Button
                label={t.profile.changePassword}
                onPress={() => void submit()}
                loading={saving}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
