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
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, ChevronBack, Skeleton, StatusPill } from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import {
  api,
  useMyPractice,
  NetworkError,
  type MyPractice,
  type PracticeProcedure,
} from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { Field, inputStyle } from "../sign-in"

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  suspended: "danger",
}
const STATUS_LABEL_KEY: Record<string, "statusPending" | "statusApproved" | "statusSuspended"> = {
  pending: "statusPending",
  approved: "statusApproved",
  suspended: "statusSuspended",
}

/**
 * A doctor's own practice settings — price, currency, consultation types,
 * and which procedures they offer. Self-service; the underlying write
 * actions (lib/actions/doctor.ts) are shared with a possible future web
 * page, but this screen is the first UI for them anywhere.
 */
export default function PracticeSettings() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useMyPractice()

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
          {t.practice.title}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {query.isLoading ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton style={{ width: "45%" }} />
            <Skeleton style={{ height: 44, borderRadius: radius.md }} />
            <Skeleton style={{ width: "45%" }} />
            <Skeleton style={{ height: 44, borderRadius: radius.md }} />
          </Card>
        ) : query.isError || !query.data ? (
          <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <StatusCard practice={query.data} />
            {/* Mounted once loaded, so form state seeds from real values and
                a procedure-toggle-triggered refetch never clobbers typing. */}
            <PracticeForm initial={query.data} />
            <ProceduresSection procedures={query.data.procedures} />
            <NeedHelpCard />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function StatusCard({ practice }: { practice: MyPractice }) {
  const { t } = useI18n()
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <AppText variant="sub" color={colors.textMuted}>
        {practice.published ? t.practice.publishedYes : t.practice.publishedNo}
      </AppText>
      <StatusPill
        label={t.practice[STATUS_LABEL_KEY[practice.status] ?? "statusPending"]}
        tone={STATUS_TONE[practice.status] ?? "neutral"}
      />
    </Card>
  )
}

function SectionHeading({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <AppText variant="heading" weight="bold">
        {title}
      </AppText>
    </View>
  )
}

function PracticeForm({ initial }: { initial: MyPractice }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [fee, setFee] = useState(initial.consultationFee ?? "")
  const [currency, setCurrency] = useState(initial.currency)
  const [offersVideo, setOffersVideo] = useState(initial.offersVideo)
  const [offersInPerson, setOffersInPerson] = useState(initial.offersInPerson)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () =>
      api.updateMyPractice({
        consultationFee: fee.trim() ? Number(fee) : undefined,
        currency: currency.trim().toUpperCase(),
        offersVideo,
        offersInPerson,
      }),
    onSuccess: () => {
      setError(null)
      setSaved(true)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      void queryClient.invalidateQueries({ queryKey: ["my-practice"] })
    },
    onError: (err) => {
      setSaved(false)
      setError(
        err instanceof NetworkError
          ? t.common.offline
          : err instanceof Error && err.message
            ? err.message
            : t.practice.saveError,
      )
    },
  })

  return (
    <Card style={{ gap: spacing.lg }}>
      <SectionHeading icon="pricetag-outline" title={t.practice.priceTitle} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 2 }}>
          <Field label={t.practice.price}>
            <TextInput
              value={fee}
              onChangeText={(v) => {
                setSaved(false)
                setFee(v.replace(/[^0-9.]/g, ""))
              }}
              placeholder={t.practice.pricePlaceholder}
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              style={[inputStyle, { textAlign: "left" }]}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t.practice.currency}>
            <TextInput
              value={currency}
              onChangeText={(v) => {
                setSaved(false)
                setCurrency(v.toUpperCase().slice(0, 3))
              }}
              autoCapitalize="characters"
              maxLength={3}
              style={[inputStyle, { textAlign: "left" }]}
            />
          </Field>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <SectionHeading icon="options-outline" title={t.practice.typesTitle} />
      <ToggleRow
        label={t.practice.videoLabel}
        hint={t.practice.videoHint}
        value={offersVideo}
        onValueChange={(v) => {
          setSaved(false)
          setOffersVideo(v)
        }}
      />
      <ToggleRow
        label={t.practice.inPersonLabel}
        hint={t.practice.inPersonHint}
        value={offersInPerson}
        onValueChange={(v) => {
          setSaved(false)
          setOffersInPerson(v)
        }}
      />

      {error ? (
        <AppText variant="sub" color={colors.danger}>
          {error}
        </AppText>
      ) : saved ? (
        <AppText variant="sub" color={colors.success}>
          {t.practice.saved}
        </AppText>
      ) : null}

      <Button label={t.practice.save} onPress={() => save.mutate()} loading={save.isPending} />
    </Card>
  )
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string
  hint: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption" color={colors.textFaint}>
          {hint}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          void Haptics.selectionAsync()
          onValueChange(v)
        }}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  )
}

function ProceduresSection({ procedures }: { procedures: PracticeProcedure[] }) {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = useMutation({
    mutationFn: (input: { procedureId: string; assign: boolean }) => api.toggleMyProcedure(input),
    onMutate: (input) => setPendingId(input.procedureId),
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ["my-practice"] })
    },
    onError: () => setError(t.practice.procedureError),
    onSettled: () => setPendingId(null),
  })

  const groups = new Map<string, PracticeProcedure[]>()
  for (const p of procedures) {
    const name = locale === "ar" ? p.categoryNameAr : p.categoryNameEn
    const bucket = groups.get(name)
    if (bucket) bucket.push(p)
    else groups.set(name, [p])
  }

  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <SectionHeading icon="medkit-outline" title={t.practice.servicesTitle} />
        <AppText variant="sub" color={colors.textMuted}>
          {t.practice.servicesHint}
        </AppText>
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      {Array.from(groups.entries()).map(([name, items]) => (
        <View key={name} style={{ gap: spacing.sm }}>
          <AppText variant="sub" weight="bold" color={colors.textMuted}>
            {name}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {items.map((p) => {
              const busy = pendingId === p.id
              return (
                <Pressable
                  key={p.id}
                  disabled={busy}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    toggle.mutate({ procedureId: p.id, assign: !p.assigned })
                  }}
                  accessibilityRole="button"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 8,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: p.assigned ? colors.primary : colors.border,
                    backgroundColor: p.assigned ? colors.primarySoft : colors.card,
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {p.assigned ? (
                    <Ionicons name="checkmark" size={13} color={colors.primary} />
                  ) : null}
                  <AppText
                    variant="caption"
                    weight={p.assigned ? "bold" : "medium"}
                    color={p.assigned ? colors.primary : colors.textMuted}
                  >
                    {locale === "ar" ? p.nameAr : p.nameEn}
                  </AppText>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </Card>
  )
}

function NeedHelpCard() {
  const { t } = useI18n()
  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="body" weight="bold">
        {t.practice.needHelpTitle}
      </AppText>
      <AppText variant="sub" color={colors.textMuted}>
        {t.practice.needHelpBody}
      </AppText>
      <Pressable
        onPress={() => router.push("/support")}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs }}
      >
        <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
        <AppText variant="sub" weight="bold" color={colors.primary}>
          {t.practice.openTicket}
        </AppText>
      </Pressable>
    </Card>
  )
}
