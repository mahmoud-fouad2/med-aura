import { useMemo, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import * as WebBrowser from "expo-web-browser"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "../../components/ui"
import {
  api,
  useDoctor,
  useSlots,
  type BookingResult,
  type ConsultationType,
} from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

export default function Booking() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"

  const doctor = useDoctor(slug)
  const [type, setType] = useState<ConsultationType>("VIDEO_CONSULTATION")
  const slots = useSlots(slug, type)

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
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
      const result = await api.book({
        doctorId: slots.data.doctorId,
        startsAt: selectedSlot,
        type,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      void queryClient.invalidateQueries({ queryKey: ["appointments"] })
      void queryClient.invalidateQueries({ queryKey: ["home"] })
      setDone(result)
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setError(err instanceof Error ? err.message : t.booking.slotTaken)
      setSelectedSlot(null)
      void slots.refetch()
    }
    setBooking(false)
  }

  // Success state replaces the whole screen — one clear next action.
  if (done) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.successSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark-circle" size={52} color={colors.success} />
        </View>
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <AppText variant="title" weight="heavy">
            {t.booking.successTitle}
          </AppText>
          <AppText
            variant="sub"
            color={colors.textMuted}
            style={{ textAlign: "center", maxWidth: 300 }}
          >
            {done.paymentConfigured ? t.booking.successPay : t.booking.successPending}
          </AppText>
        </View>
        <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
          {done.paymentConfigured && done.checkoutUrl ? (
            <Button
              label={t.booking.payNow}
              icon="card"
              onPress={() => void WebBrowser.openBrowserAsync(done.checkoutUrl!)}
            />
          ) : null}
          <Button
            label={t.booking.viewAppointments}
            variant="secondary"
            onPress={() => router.replace("/(tabs)/appointments")}
          />
        </View>
      </View>
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="bold">
            {t.booking.title}
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

        {slots.isLoading ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton style={{ height: 56, borderRadius: radius.lg }} />
            <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
          </View>
        ) : slots.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t.common.loadFailed}
            action={
              <Button
                label={t.common.retry}
                variant="secondary"
                onPress={() => void slots.refetch()}
              />
            }
          />
        ) : days.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t.booking.noSlots} />
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
            label={t.booking.confirm}
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
