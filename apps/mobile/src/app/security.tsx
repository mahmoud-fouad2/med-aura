import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, ChevronBack, SectionHeading } from "../components/ui"
import { Field, FormError, inputStyle } from "../components/form"
import { authClient } from "../lib/auth-client"
import { api } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

type Status = { enabled: boolean; totpVerified: boolean; otpAvailable: boolean }
type Step =
  | { name: "idle" }
  | { name: "enable-password" }
  | { name: "backup-codes"; codes: string[]; totpURI: string }
  | { name: "totp-setup-password" }
  | { name: "totp-setup"; totpURI: string }
  | { name: "disable-confirm" }
  | { name: "regenerate-password" }
  | { name: "regenerate-codes"; codes: string[] }

function keyFromURI(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? ""
  } catch {
    return ""
  }
}

export default function Security() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Status | null>(null)
  const [step, setStep] = useState<Step>({ name: "idle" })
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [savedConfirmed, setSavedConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .security()
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, totpVerified: false, otpAvailable: false }))
      .finally(() => setLoading(false))
  }, [])

  function resetStepState() {
    setPassword("")
    setCode("")
    setSavedConfirmed(false)
    setError(null)
    setBusy(false)
  }

  function closeStep() {
    setStep({ name: "idle" })
    resetStepState()
  }

  async function handleEnable() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.enable({ password })
    setBusy(false)
    if (err || !data) {
      setError(err?.status === 401 ? t.security.wrongPassword : t.security.error)
      return
    }
    setStatus((s) => (s ? { ...s, enabled: true, otpAvailable: true } : s))
    resetStepState()
    setStep({ name: "backup-codes", codes: data.backupCodes, totpURI: data.totpURI })
  }

  async function handleDisable() {
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.disable({ password })
    setBusy(false)
    if (err) {
      setError(err.status === 401 ? t.security.wrongPassword : t.security.error)
      return
    }
    setStatus({ enabled: false, totpVerified: false, otpAvailable: false })
    closeStep()
  }

  async function handleGetTotpUri() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.getTotpUri({ password })
    setBusy(false)
    if (err || !data) {
      setError(err?.status === 401 ? t.security.wrongPassword : t.security.error)
      return
    }
    resetStepState()
    setStep({ name: "totp-setup", totpURI: data.totpURI })
  }

  async function handleVerifyTotp() {
    if (code.trim().length < 6) return
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: code.trim() })
    setBusy(false)
    if (err) {
      setError(t.security.invalidCode)
      return
    }
    setStatus((s) => (s ? { ...s, totpVerified: true } : s))
    closeStep()
  }

  async function handleRegenerate() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.generateBackupCodes({ password })
    setBusy(false)
    if (err || !data) {
      setError(err?.status === 401 ? t.security.wrongPassword : t.security.error)
      return
    }
    resetStepState()
    setStep({ name: "regenerate-codes", codes: data.backupCodes })
  }

  const badge = status?.totpVerified
    ? { label: t.security.fullyProtected, color: colors.success, bg: colors.successSoft, icon: "shield-checkmark" as const }
    : status?.enabled
      ? { label: t.security.protectedLabel, color: colors.primary, bg: colors.primarySoft, icon: "shield-checkmark-outline" as const }
      : { label: t.security.notEnabled, color: colors.textMuted, bg: colors.border, icon: "shield-outline" as const }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
          onPress={() => (step.name === "idle" ? router.back() : closeStep())}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          hitSlop={8}
        >
          <ChevronBack size={22} />
        </Pressable>
        <AppText variant="title" weight="heavy">
          {t.security.title}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {loading || !status ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : step.name === "idle" ? (
          <>
            <Card style={{ gap: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.lg,
                    backgroundColor: badge.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={badge.icon} size={22} color={badge.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="bold">
                    {badge.label}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t.security.intro}
                  </AppText>
                </View>
              </View>
              <Button
                label={status.enabled ? t.security.disable : t.security.enable}
                variant={status.enabled ? "secondary" : "primary"}
                onPress={() =>
                  status.enabled ? setStep({ name: "disable-confirm" }) : setStep({ name: "enable-password" })
                }
              />
            </Card>

            {status.enabled && (
              <>
                <Card style={{ gap: spacing.sm }}>
                  <SectionHeading icon="mail-outline" title={t.security.email} />
                  <AppText variant="caption" color={colors.textMuted}>
                    {t.security.emailDesc}
                  </AppText>
                  <StatusPill label={t.security.emailActive} />
                </Card>

                <Card style={{ gap: spacing.sm }}>
                  <SectionHeading icon="phone-portrait-outline" title={t.security.totp} />
                  <AppText variant="caption" color={colors.textMuted}>
                    {t.security.totpDesc}
                  </AppText>
                  {status.totpVerified ? <StatusPill label={t.security.totpVerified} /> : null}
                  <Button
                    label={status.totpVerified ? t.security.reSetup : t.security.setup}
                    variant="secondary"
                    onPress={() => setStep({ name: "totp-setup-password" })}
                  />
                </Card>

                <Card style={{ gap: spacing.sm }}>
                  <SectionHeading icon="key-outline" title={t.security.backupCodes} tone="gold" />
                  <Button
                    label={t.security.viewBackupCodes}
                    variant="secondary"
                    onPress={() => setStep({ name: "regenerate-password" })}
                  />
                </Card>
              </>
            )}
          </>
        ) : step.name === "enable-password" || step.name === "regenerate-password" || step.name === "totp-setup-password" ? (
          <Card style={{ gap: spacing.lg }}>
            <SectionHeading icon="lock-closed-outline" title={t.security.passwordLabel} />
            <Field label={t.security.passwordLabel}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                autoFocus
                style={inputStyle}
                textAlign="left"
              />
            </Field>
            {error ? <FormError message={error} /> : null}
            <Button
              label={t.security.confirm}
              loading={busy}
              onPress={() =>
                void (step.name === "enable-password"
                  ? handleEnable()
                  : step.name === "regenerate-password"
                    ? handleRegenerate()
                    : handleGetTotpUri())
              }
            />
          </Card>
        ) : step.name === "disable-confirm" ? (
          <Card style={{ gap: spacing.lg }}>
            <SectionHeading icon="warning-outline" title={t.security.disableConfirmTitle} tone="danger" />
            <AppText variant="sub" color={colors.textMuted}>
              {t.security.disableConfirmBody}
            </AppText>
            {error ? <FormError message={error} /> : null}
            <Button label={t.security.disable} variant="secondary" loading={busy} onPress={() => void handleDisable()} />
          </Card>
        ) : step.name === "backup-codes" || step.name === "regenerate-codes" ? (
          <Card style={{ gap: spacing.lg }}>
            <SectionHeading icon="key-outline" title={t.security.backupTitle} tone="gold" />
            <AppText variant="caption" color={colors.textMuted}>
              {t.security.backupDesc}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                backgroundColor: colors.background,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
              }}
            >
              {step.codes.map((c) => (
                <AppText key={c} variant="body" style={{ writingDirection: "ltr", width: "45%" }}>
                  {c}
                </AppText>
              ))}
            </View>
            <Button
              label={t.security.copyAll}
              variant="secondary"
              icon="copy-outline"
              onPress={() => void Clipboard.setStringAsync(step.codes.join("\n"))}
            />
            {step.name === "backup-codes" ? (
              <>
                <Pressable
                  onPress={() => setSavedConfirmed((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: savedConfirmed }}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      borderWidth: savedConfirmed ? 0 : 1.5,
                      borderColor: colors.border,
                      backgroundColor: savedConfirmed ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {savedConfirmed ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}
                  </View>
                  <AppText variant="sub" style={{ flex: 1 }}>
                    {t.security.backupSavedConfirm}
                  </AppText>
                </Pressable>
                <Button
                  label={t.security.setupTotpNow}
                  disabled={!savedConfirmed}
                  onPress={() => {
                    const totpURI = step.totpURI
                    resetStepState()
                    setStep({ name: "totp-setup", totpURI })
                  }}
                />
                <Button
                  label={t.security.finishNoTotp}
                  variant="secondary"
                  disabled={!savedConfirmed}
                  onPress={closeStep}
                />
              </>
            ) : (
              <Button label={t.security.done} onPress={closeStep} />
            )}
          </Card>
        ) : step.name === "totp-setup" ? (
          <Card style={{ gap: spacing.lg }}>
            <SectionHeading icon="phone-portrait-outline" title={t.security.totpSetupTitle} />
            <AppText variant="caption" color={colors.textMuted}>
              {t.security.totpSetupDesc}
            </AppText>
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                alignItems: "center",
              }}
            >
              <AppText variant="caption" color={colors.textFaint}>
                {t.security.manualKey}
              </AppText>
              <AppText variant="body" weight="bold" style={{ writingDirection: "ltr", marginTop: 4 }} selectable>
                {keyFromURI(step.totpURI)}
              </AppText>
            </View>
            <Field label={t.security.codeLabel}>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={[inputStyle, { textAlign: "center", letterSpacing: 6, fontSize: 18 }]}
              />
            </Field>
            {error ? <FormError message={error} /> : null}
            <Button label={t.security.verify} loading={busy} onPress={() => void handleVerifyTotp()} />
          </Card>
        ) : null}
      </ScrollView>
    </View>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        backgroundColor: colors.successSoft,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
      }}
    >
      <Ionicons name="checkmark" size={14} color={colors.success} />
      <AppText variant="caption" weight="bold" color={colors.success}>
        {label}
      </AppText>
    </View>
  )
}
