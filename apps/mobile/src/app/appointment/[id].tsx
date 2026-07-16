import { Pressable, ScrollView, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as WebBrowser from "expo-web-browser"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Card,
  ChevronBack,
  EmptyState,
  Skeleton,
  StatusPill,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import { useAppointments, type Appointment } from "../../lib/api"
import { API_URL } from "../../lib/config"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { appointmentTone } from "../(tabs)/index"

/**
 * Full appointment record. Reads the same query the list uses — reached from
 * the list, the data is already in cache and the screen opens instantly.
 */
export default function AppointmentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useAppointments()

  const appointment = query.data?.appointments.find((a) => a.id === id)

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.md,
      }}
    >
      <View
        style={{
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
          {t.appointmentDetails.title}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
      >
        {query.isLoading ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton style={{ width: "55%" }} />
            <Skeleton style={{ width: "40%" }} />
            <Skeleton style={{ width: "70%" }} />
          </Card>
        ) : query.isError ? (
          <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : !appointment ? (
          <EmptyState
            icon="calendar-outline"
            title={t.appointmentDetails.notFound}
          />
        ) : (
          <Details appointment={appointment} locale={locale} />
        )}
      </ScrollView>
    </View>
  )
}

function Details({
  appointment,
  locale,
}: {
  appointment: Appointment
  locale: string
}) {
  const { t } = useI18n()
  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
  const starts = new Date(appointment.startsAt)
  const typeLabel =
    appointment.type === "VIDEO_CONSULTATION"
      ? t.booking.typeVideo
      : t.booking.typeInPerson

  return (
    <>
      {/* Who */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Avatar
          name={appointment.counterpartName}
          photoUrl={appointment.counterpartPhotoUrl}
          size={56}
        />
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={colors.textMuted}>
            {t.appointmentDetails.doctor}
          </AppText>
          <AppText variant="body" weight="bold" numberOfLines={1}>
            {appointment.counterpartName}
          </AppText>
        </View>
        <StatusPill
          label={t.status[appointment.status] ?? appointment.status}
          tone={appointmentTone(appointment.status)}
        />
      </Card>

      {/* When + what */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <DetailRow
          icon="calendar-outline"
          label={t.appointmentDetails.date}
          value={starts.toLocaleDateString(intl, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
        <RowDivider />
        <DetailRow
          icon="time-outline"
          label={t.appointmentDetails.time}
          value={starts.toLocaleTimeString(intl, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <RowDivider />
        <DetailRow
          icon={
            appointment.type === "VIDEO_CONSULTATION"
              ? "videocam-outline"
              : "business-outline"
          }
          label={t.appointmentDetails.type}
          value={typeLabel}
        />
        <RowDivider />
        {/* The reference is what support asks for — keep it LTR and selectable. */}
        <DetailRow
          icon="bookmark-outline"
          label={t.appointmentDetails.reference}
          value={appointment.reference}
          ltr
          selectable
        />
        {appointment.priceAmount ? (
          <>
            <RowDivider />
            <DetailRow
              icon="card-outline"
              label={t.appointmentDetails.price}
              value={`${appointment.priceAmount} ${appointment.currency}`}
              ltr
            />
          </>
        ) : null}
        {appointment.paymentStatus ? (
          <>
            <RowDivider />
            <DetailRow
              icon="shield-checkmark-outline"
              label={t.appointmentDetails.payment}
              value={
                t.paymentStatus[appointment.paymentStatus] ??
                appointment.paymentStatus
              }
            />
          </>
        ) : null}
      </Card>

      {/* Policy */}
      <View
        style={{
          backgroundColor: colors.primarySoft,
          borderRadius: radius.md,
          padding: spacing.md,
        }}
      >
        <AppText variant="caption" color={colors.textMuted}>
          {t.booking.cancelPolicy}
        </AppText>
      </View>

      {/* Support */}
      <Card
        onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/contact`)}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.lg,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="help-buoy-outline" size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="sub" weight="bold">
            {t.appointmentDetails.contactSupport}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t.appointmentDetails.supportHint}
          </AppText>
        </View>
      </Card>
    </>
  )
}

function DetailRow({
  icon,
  label,
  value,
  ltr,
  selectable,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  ltr?: boolean
  selectable?: boolean
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="sub" color={colors.textMuted} style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText
        variant="sub"
        weight="bold"
        selectable={selectable}
        style={ltr ? { writingDirection: "ltr" } : undefined}
      >
        {value}
      </AppText>
    </View>
  )
}

function RowDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: spacing.lg,
      }}
    />
  )
}
