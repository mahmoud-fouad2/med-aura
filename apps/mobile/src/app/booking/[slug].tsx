import { useMemo, useState } from "react"
import { Pressable, ScrollView, TextInput, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import * as WebBrowser from "expo-web-browser"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import {
  AppText,
  Avatar,
  Button,
  Card,
  ChevronBack,
  EmptyState,
  Skeleton,
} from "../../components/ui"
import { Field, inputStyle } from "../../components/form"
import { stateArt } from "../../components/brand"
import { QueryErrorState } from "../../components/query-error"
import { api, useDoctor, useSlots, type BookingResult, type ConsultationType } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { queryKeys } from "../../lib/query-keys"
import { localizedApiError } from "../../lib/request-errors"
import { colors, radius, spacing } from "../../theme"

export default function Booking() {
  const { slug, reschedule, appointmentType } = useLocalSearchParams<{
    slug: string
    reschedule?: string
    appointmentType?: ConsultationType
  }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"

  const doctor = useDoctor(slug)
  const [type, setType] = useState<ConsultationType>(
    appointmentType === "IN_PERSON_CONSULTATION"
      ? "IN_PERSON_CONSULTATION"
      : "VIDEO_CONSULTATION",
  )
  const slots = useSlots(slug, type)

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<BookingResult | null>(null)

  // Group slots by local calendar day.
  const days = useMemo(() => {
    const map = new Map<string, { startsAt: string }[]>()
    for (const s of slots.data?.slots ?? []) {
      const key = new Date(s.startsAt).toDateString()
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return [...map.entries()].map(([key, list]) => ({ key, list }))
  }, [slots.data])

  const activeDay = days.find((d) => d.key === selectedDay) ?? days[0]

  const confirm = async () => {
    if (!selectedSlot || !slots.data || booking) return
    setBooking(true)
    setError(null)
    try {
      const result = reschedule
        ? {
            ...(await api.rescheduleMissedAppointment(reschedule, selectedSlot)),
            paymentConfigured: false,
          }
        : await api.book({
            doctorId: slots.data.doctorId,
            startsAt: selectedSlot,
            type,
            promoCode: promoCode.trim() || undefined,
          })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.home })
      setDone(result)
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      // A NetworkError's message is the literal English word "offline" (see
      // lib/api.ts) — never render it as-is. Any other thrown Error already
      // carries the server's own (Arabic) message; a non-Error throw falls
      // back to the slot-taken copy, the most likely real cause here.
      setError(localizedApiError(err, locale, {
        fallback: t.booking.slotTaken,
        offline: t.common.offline,
        timeout: t.common.timeout,
        validation: t.booking.slotTaken,
        conflict: t.booking.slotTaken,
        rateLimited: t.common.rateLimited,
      }))
      setSelectedSlot(null)
      void slots.refetch()
    }
    setBooking(false)
  }

  // Opens Stripe Checkout as an auth session, not a plain browser tab —
  // openAuthSessionAsync watches for the medaura:// redirect Stripe sends
  // back to (see lib/actions/booking.ts's platform:"mobile" branch) and
  // auto-closes the browser itself, the same mechanism already used for
  // Google sign-in, instead of leaving the patient stranded on the web page.
  const payNow = async (checkoutUrl: string) => {
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, "medaura://booking-payment")
    if (result.type === "success" && result.url.includes("status=success")) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
      void queryClient.invalidateQueries({ queryKey: queryKeys.home })
      router.replace("/(tabs)/appointments")
    }
    // cancel/dismiss (or a canceled Stripe redirect): stay on this screen so
    // the patient can retry — the appointment already exists, unpaid.
  }

  // Success state replaces the whole screen — one clear next action.
  if (done) {
    const bookedStart = selectedSlot ? new Date(selectedSlot) : null
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
      >
        <Image
          source={stateArt.bookingSuccess}
          style={{ width: 220, height: 165 }}
          contentFit="contain"
          transition={240}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <AppText variant="title" weight="heavy">
            {reschedule ? t.booking.rescheduleSuccessTitle : t.booking.successTitle}
          </AppText>
          <AppText
            variant="sub"
            color={colors.textMuted}
            style={{ textAlign: "center", maxWidth: 300 }}
          >
            {reschedule
              ? t.booking.rescheduleSuccessBody
              : done.paymentConfigured
                ? t.booking.successPay
                : t.booking.successPending}
          </AppText>
        </View>

        {/* Recap of what was just booked — reassurance, not decoration:
            confirms the doctor/time/date actually matches what was picked. */}
        {doctor.data && bookedStart ? (
          <Card style={{ alignSelf: "stretch", gap: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Avatar name={doctor.data.name} photoUrl={doctor.data.photoUrl} size={44} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="bold" numberOfLines={1}>
                  {doctor.data.name}
                </AppText>
                {doctor.data.title ? (
                  <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {doctor.data.title}
                  </AppText>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <RecapChip
                icon="time-outline"
                label={t.appointmentDetails.time}
                value={bookedStart.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit" })}
              />
              <RecapChip
                icon="calendar-outline"
                label={t.appointmentDetails.date}
                value={bookedStart.toLocaleDateString(intl, { day: "numeric", month: "long" })}
              />
            </View>
          </Card>
        ) : null}

        <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
          {done.paymentConfigured && done.checkoutUrl ? (
            <Button
              label={t.booking.payNow}
              icon="card"
              onPress={() => void payNow(done.checkoutUrl!)}
            />
          ) : null}
          <Button
            label={t.booking.viewAppointments}
            variant="secondary"
            onPress={() => router.replace("/(tabs)/appointments")}
          />
        </View>
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <ChevronBack size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="bold">
            {reschedule ? t.booking.rescheduleTitle : t.booking.title}
          </AppText>
          {doctor.data ? (
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {doctor.data.name}
            </AppText>
          ) : null}
        </View>
        {doctor.data ? (
          <Avatar name={doctor.data.name} photoUrl={doctor.data.photoUrl} size={40} />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.lg,
          paddingBottom: 140,
        }}
      >
        {/* Consultation type */}
        {!reschedule ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {doctor.data?.offersVideo !== false && (
            <TypeChip
              icon="videocam"
              label={t.booking.typeVideo}
              active={type === "VIDEO_CONSULTATION"}
              onPress={() => {
                setType("VIDEO_CONSULTATION")
                setSelectedDay(null)
                setSelectedSlot(null)
              }}
            />
          )}
          {doctor.data?.offersInPerson && (
            <TypeChip
              icon="business"
              label={t.booking.typeInPerson}
              active={type === "IN_PERSON_CONSULTATION"}
              onPress={() => {
                setType("IN_PERSON_CONSULTATION")
                setSelectedDay(null)
                setSelectedSlot(null)
              }}
            />
          )}
        </View>
        ) : null}

        {slots.isLoading ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton style={{ height: 56, borderRadius: radius.lg }} />
            <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
          </View>
        ) : slots.isError ? (
          <QueryErrorState error={slots.error} onRetry={() => void slots.refetch()} />
        ) : days.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            art={stateArt.noAppointments}
            title={t.booking.noSlots}
          />
        ) : (
          <>
            {/* Day picker */}
            <View style={{ gap: spacing.sm }}>
              <AppText variant="sub" weight="bold">
                {t.booking.pickDay}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {days.map((d) => {
                  const date = new Date(d.list[0].startsAt)
                  const active = d.key === (activeDay?.key ?? "")
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => {
                        void Haptics.selectionAsync()
                        setSelectedDay(d.key)
                        setSelectedSlot(null)
                      }}
                      style={{
                        alignItems: "center",
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.lg,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.card,
                        gap: 2,
                      }}
                    >
                      <AppText
                        variant="caption"
                        weight="medium"
                        color={active ? "rgba(255,255,255,0.8)" : colors.textMuted}
                      >
                        {date.toLocaleDateString(intl, { weekday: "short" })}
                      </AppText>
                      <AppText
                        variant="body"
                        weight="heavy"
                        color={active ? "#FFFFFF" : colors.text}
                      >
                        {date.toLocaleDateString(intl, { day: "numeric", month: "short" })}
                      </AppText>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* Time slots */}
            <View style={{ gap: spacing.sm }}>
              <AppText variant="sub" weight="bold">
                {t.booking.pickTime}
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {(activeDay?.list ?? []).map((s) => {
                  const active = s.startsAt === selectedSlot
                  return (
                    <Pressable
                      key={s.startsAt}
                      onPress={() => {
                        void Haptics.selectionAsync()
                        setSelectedSlot(s.startsAt)
                        setError(null)
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: spacing.lg,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : colors.card,
                      }}
                    >
                      <AppText
                        variant="sub"
                        weight={active ? "bold" : "regular"}
                        color={active ? colors.primary : colors.text}
                      >
                        {new Date(s.startsAt).toLocaleTimeString(intl, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </AppText>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <Card style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText variant="sub" color={colors.textMuted}>
                  {t.booking.fee}
                </AppText>
                <AppText variant="body" weight="heavy" color={colors.primary}>
                  {slots.data?.consultationFee ?? "—"}{" "}
                  <AppText variant="caption" color={colors.textFaint}>
                    {slots.data?.currency ?? ""}
                  </AppText>
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textFaint}>
                {t.booking.cancelPolicy}
              </AppText>
            </Card>

            <Card>
              <Field label={`${t.booking.promoCode} (${t.booking.promoCodeOptional})`}>
                <TextInput
                  value={promoCode}
                  onChangeText={(v) => setPromoCode(v.toUpperCase())}
                  placeholder={t.booking.promoCodePlaceholder}
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={inputStyle}
                  textAlign="left"
                />
              </Field>
            </Card>
          </>
        )}

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
      </ScrollView>

      {/* Sticky confirm bar */}
      {days.length > 0 && !slots.isLoading ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: spacing.screen,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Button
            label={reschedule ? t.booking.confirmReschedule : t.booking.confirm}
            icon="checkmark"
            onPress={() => void confirm()}
            loading={booking}
            disabled={!selectedSlot}
          />
        </View>
      ) : null}
    </View>
  )
}

function RecapChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: colors.primarySoft,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="sub" weight="bold" numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  )
}

function TypeChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        paddingVertical: 12,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.card,
      }}
    >
      <Ionicons name={icon} size={17} color={active ? colors.primary : colors.textMuted} />
      <AppText
        variant="sub"
        weight={active ? "bold" : "medium"}
        color={active ? colors.primary : colors.textMuted}
      >
        {label}
      </AppText>
    </Pressable>
  )
}
