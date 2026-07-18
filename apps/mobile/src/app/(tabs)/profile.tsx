import { useEffect, useState } from "react"
import { Pressable, ScrollView, Switch, View } from "react-native"
import { router } from "expo-router"
import Constants from "expo-constants"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import * as WebBrowser from "expo-web-browser"
import * as SecureStore from "expo-secure-store"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  ChevronForward,
  Skeleton,
} from "../../components/ui"
import { BottomSheet } from "../../components/bottom-sheet"
import { useMe } from "../../lib/api"
import {
  authenticate,
  biometricAvailability,
  isAppLockEnabled,
  setAppLockEnabled,
} from "../../lib/app-lock"
import { setRememberMe } from "../../lib/session-prefs"
import { authClient } from "../../lib/auth-client"
import { API_URL } from "../../lib/config"
import { useI18n, type Locale } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { ONBOARDING_KEY } from "../index"

/** Notification switches persist on-device until the push backend exists. */
const NOTIFY_KEYS = {
  appointments: "medaura.notify.appointments",
  payments: "medaura.notify.payments",
  files: "medaura.notify.files",
  offers: "medaura.notify.offers",
} as const

export default function Profile() {
  const { t, locale, setLocale } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const me = useMe()

  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [languageSheet, setLanguageSheet] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const signOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    // The server sign-out must never be able to hang the button: race it
    // against a short timeout. Local sign-out is what actually matters — a
    // stale server session expires on its own, but the user must always get
    // out of their account immediately.
    await Promise.race([
      authClient.signOut().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ])
    // Wipe everything tied to this account before the next person signs in:
    // cached data, the biometric lock preference, and the persisted session.
    queryClient.clear()
    await Promise.all([
      setAppLockEnabled(false).catch(() => undefined),
      setRememberMe(false).catch(() => undefined),
    ])
    setSigningOut(false)
    setConfirmSignOut(false)
    router.replace("/sign-in")
  }

  const switchLanguage = async (l: Locale) => {
    setLanguageSheet(false)
    if (l === locale) return
    await setLocale(l)
  }

  const clearCache = async () => {
    queryClient.clear()
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setNotice(t.profile.clearCacheDone)
  }

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0"

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        padding: spacing.screen,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
    >
      <AppText variant="title" weight="heavy">
        {t.profile.title}
      </AppText>

      {/* Identity */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        {me.isLoading ? (
          <>
            <Skeleton style={{ width: 56, height: 56, borderRadius: 28 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton style={{ width: "50%" }} />
              <Skeleton style={{ width: "70%" }} />
            </View>
          </>
        ) : (
          <>
            <Avatar name={me.data?.name ?? "؟"} size={56} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold">
                {me.data?.name ?? ""}
              </AppText>
              {/* Email stays LTR even inside the Arabic UI. */}
              <AppText variant="caption" color={colors.textMuted} style={{ writingDirection: "ltr" }}>
                {me.data?.email ?? ""}
              </AppText>
            </View>
          </>
        )}
      </Card>

      {/* Account */}
      <Section title={t.profile.sectionAccount}>
        <Row
          icon="person-outline"
          label={t.profile.editProfile}
          hint={t.profile.editProfileHint}
          onPress={() => router.push("/edit-profile")}
        />
        <Divider />
        <Row
          icon="key-outline"
          label={t.profile.changePassword}
          onPress={() => router.push("/change-password")}
        />
      </Section>

      {/* Language & appearance */}
      <Section title={t.profile.sectionAppearance}>
        <Row
          icon="language-outline"
          label={t.profile.language}
          value={locale === "ar" ? t.profile.arabic : t.profile.english}
          onPress={() => setLanguageSheet(true)}
        />
        <Divider />
        <Row
          icon="sparkles-outline"
          label={t.profile.aboutOnboarding}
          onPress={async () => {
            await SecureStore.deleteItemAsync(ONBOARDING_KEY)
            router.push("/onboarding")
          }}
        />
      </Section>

      {/* Notifications — stored on-device; the push backend is not wired yet,
          so these are preferences the app will honour once it is. */}
      <Section title={t.profile.sectionNotifications}>
        <ToggleRow
          storageKey={NOTIFY_KEYS.appointments}
          label={t.profile.notifyAppointments}
          hint={t.profile.notifyAppointmentsHint}
          defaultValue
        />
        <Divider />
        <ToggleRow
          storageKey={NOTIFY_KEYS.payments}
          label={t.profile.notifyPayments}
          hint={t.profile.notifyPaymentsHint}
          defaultValue
        />
        <Divider />
        <ToggleRow
          storageKey={NOTIFY_KEYS.files}
          label={t.profile.notifyFiles}
          hint={t.profile.notifyFilesHint}
          defaultValue
        />
        <Divider />
        <ToggleRow
          storageKey={NOTIFY_KEYS.offers}
          label={t.profile.notifyOffers}
          hint={t.profile.notifyOffersHint}
        />
      </Section>

      {/* Security */}
      <Section title={t.profile.sectionSecurity}>
        <AppLockRow onNotice={setNotice} />
        <Divider />
        <Row
          icon="trash-bin-outline"
          label={t.profile.clearCache}
          hint={t.profile.clearCacheHint}
          onPress={() => void clearCache()}
        />
      </Section>

      {/* Support & info */}
      <Section title={t.profile.sectionSupport}>
        <Row
          icon="help-buoy-outline"
          label={t.profile.support}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/contact`)}
        />
        <Divider />
        <Row
          icon="help-circle-outline"
          label={t.profile.faq}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/faq`)}
        />
        <Divider />
        <Row
          icon="shield-outline"
          label={t.profile.privacy}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}
        />
        <Divider />
        <Row
          icon="document-text-outline"
          label={t.profile.terms}
          onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)}
        />
        <Divider />
        <Row
          icon="information-circle-outline"
          label={t.profile.about}
          value={`${t.profile.version} ${version}`}
        />
      </Section>

      {/* Neutral-informative: this box also carries "can't enable" guidance,
          not only successes, so it mustn't read as a green confirmation. */}
      {notice ? (
        <View
          style={{
            backgroundColor: colors.primarySoft,
            borderRadius: radius.md,
            padding: spacing.md,
          }}
        >
          <AppText variant="sub" color={colors.primary}>
            {notice}
          </AppText>
        </View>
      ) : null}

      <Button
        label={t.auth.signOut}
        variant="secondary"
        icon="log-out-outline"
        onPress={() => setConfirmSignOut(true)}
        style={{ backgroundColor: colors.dangerSoft }}
      />

      {/* Language picker */}
      <BottomSheet
        visible={languageSheet}
        onClose={() => setLanguageSheet(false)}
        title={t.profile.language}
        description={t.profile.restartNote}
      >
        <View style={{ gap: spacing.sm }}>
          {(
            [
              ["ar", t.profile.arabic],
              ["en", t.profile.english],
            ] as const
          ).map(([code, label]) => (
            <Pressable
              key={code}
              onPress={() => void switchLanguage(code)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: locale === code ? colors.primary : colors.border,
                backgroundColor: locale === code ? colors.primarySoft : colors.card,
              }}
            >
              <AppText
                variant="body"
                weight={locale === code ? "bold" : "regular"}
                color={locale === code ? colors.primary : colors.text}
              >
                {label}
              </AppText>
              {locale === code ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* Sign-out confirm */}
      <BottomSheet
        visible={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title={t.auth.signOut}
        description={t.auth.signOutConfirm}
      >
        <View style={{ gap: spacing.sm }}>
          <Button
            label={t.auth.signOut}
            onPress={() => void signOut()}
            loading={signingOut}
            style={{ backgroundColor: colors.danger }}
          />
          <Button
            label={t.common.cancel}
            variant="ghost"
            onPress={() => setConfirmSignOut(false)}
          />
        </View>
      </BottomSheet>
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="sub" weight="bold" color={colors.textMuted}>
        {title}
      </AppText>
      <Card style={{ padding: 0, overflow: "hidden" }}>{children}</Card>
    </View>
  )
}

function Row({
  icon,
  label,
  hint,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  hint?: string
  value?: string
  onPress?: () => void
}) {
  const content = (
    <>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={colors.textFaint}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color={colors.textMuted}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <ChevronForward size={16} /> : null}
    </>
  )

  if (!onPress) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.lg,
        }}
      >
        {content}
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: pressed ? colors.primarySoft : "transparent",
      })}
    >
      {content}
    </Pressable>
  )
}

function ToggleRow({
  storageKey,
  label,
  hint,
  defaultValue = false,
}: {
  storageKey: string
  label: string
  hint?: string
  defaultValue?: boolean
}) {
  const [enabled, setEnabled] = useState(defaultValue)

  // Preference reads are best-effort: a storage hiccup should never block the
  // settings screen from rendering.
  useEffect(() => {
    let alive = true
    SecureStore.getItemAsync(storageKey)
      .then((saved) => {
        if (alive && saved != null) setEnabled(saved === "1")
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [storageKey])

  const toggle = (next: boolean) => {
    setEnabled(next)
    void Haptics.selectionAsync()
    void SecureStore.setItemAsync(storageKey, next ? "1" : "0").catch(() => undefined)
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={colors.textFaint}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={enabled}
        onValueChange={toggle}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  )
}

/**
 * Biometric app lock. Turning it ON requires enrolled biometrics and one
 * successful authentication (never lock behind a check that can't pass);
 * turning it OFF demands the same proof — removing protection is as
 * sensitive as adding it.
 */
function AppLockRow({ onNotice }: { onNotice: (message: string) => void }) {
  const { t } = useI18n()
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    isAppLockEnabled()
      .then((value) => {
        if (alive) setEnabled(value)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const toggle = async (next: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (next) {
        const availability = await biometricAvailability()
        if (availability === "no-hardware") {
          onNotice(t.profile.appLockNoHardware)
          return
        }
        if (availability === "not-enrolled") {
          onNotice(t.profile.appLockNotEnrolled)
          return
        }
      }
      const ok = await authenticate(t.lock.prompt, t.common.cancel)
      if (!ok) return
      await setAppLockEnabled(next)
      setEnabled(next)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onNotice(next ? t.profile.appLockOn : t.profile.appLockOff)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
      }}
    >
      <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{t.profile.appLock}</AppText>
        <AppText variant="caption" color={colors.textFaint}>
          {t.profile.appLockHint}
        </AppText>
      </View>
      <Switch
        value={enabled}
        disabled={busy}
        onValueChange={(v) => void toggle(v)}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#FFFFFF"
        accessibilityLabel={t.profile.appLock}
      />
    </View>
  )
}

function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }}
    />
  )
}
