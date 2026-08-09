import { useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQueryClient } from "@tanstack/react-query"
import { Ionicons } from "@expo/vector-icons"
import { VideoCard } from "../../../components/video-card"
import {
  AppText,
  Avatar,
  Button,
  Card,
  ChevronBack,
  ChevronForward,
  EmptyState,
  IconBadge,
  Skeleton,
  StatusPill,
} from "../../../components/ui"
import { QueryErrorState } from "../../../components/query-error"
import { api, useAppointments, useMe, downloadInvoicePdf, presentDownloadedPdf, type Appointment } from "../../../lib/api"
import { useI18n } from "../../../lib/i18n"
import { colors, radius, spacing } from "../../../theme"
import { appointmentTone } from "../../(tabs)/index"

/**
 * Full appointment record. Reads the same query the list uses — reached from
 * the list, the data is already in cache and the screen opens instantly.
 */
export default function AppointmentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useAppointments()
  const me = useMe()
  const isDoctor = me.data?.accountType === "doctor"

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
          <Details appointment={appointment} locale={locale} isDoctor={isDoctor} />
        )}
      </ScrollView>
    </View>
  )
}

function Details({
  appointment,
  locale,
  isDoctor,
}: {
  appointment: Appointment
  locale: string
  isDoctor: boolean
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function markNoShow() {
    if (updatingStatus) return
    setUpdatingStatus(true)
    try {
      await api.markAppointmentNoShow(appointment.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ])
      Alert.alert(t.appointmentDetails.noShowMarked)
    } catch (err) {
      Alert.alert(
        t.appointmentDetails.actionError,
        err instanceof Error ? err.message : undefined,
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  function confirmNoShow() {
    Alert.alert(
      t.appointmentDetails.markNoShowConfirmTitle,
      t.appointmentDetails.markNoShowConfirmBody,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.confirm,
          style: "destructive",
          onPress: () => void markNoShow(),
        },
      ],
    )
  }

  async function onDownloadInvoice() {
    if (downloadingInvoice || !appointment.paymentId) return
    setDownloadingInvoice(true)
    setDownloadError(false)
    try {
      const fileUri = await downloadInvoicePdf(appointment.paymentId)
      await presentDownloadedPdf(fileUri)
    } catch {
      setDownloadError(true)
    } finally {
      setDownloadingInvoice(false)
    }
  }

  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
  const starts = new Date(appointment.startsAt)
  const durationMinutes = Math.round(
    (new Date(appointment.endsAt).getTime() - starts.getTime()) / 60_000,
  )
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
            {isDoctor ? t.appointmentDetails.patient : t.appointmentDetails.doctor}
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

      {!isDoctor && appointment.status === "NO_SHOW" ? (
        <View
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.dangerSoft,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <AppText variant="body" weight="bold" color={colors.danger}>
              {t.appointmentDetails.noShowTitle}
            </AppText>
          </View>
          <AppText variant="sub" color={colors.textMuted}>
            {t.appointmentDetails.noShowBody}
          </AppText>
          {appointment.doctorSlug ? (
            <Button
              label={t.appointmentDetails.rescheduleMissed}
              icon="calendar"
              onPress={() =>
                router.push({
                  pathname: "/booking/[slug]",
                  params: {
                    slug: appointment.doctorSlug!,
                    reschedule: appointment.id,
                    appointmentType: appointment.type,
                  },
                })
              }
            />
          ) : null}
        </View>
      ) : null}

      {isDoctor && appointment.canMarkNoShow ? (
        <Button
          label={t.appointmentDetails.markNoShow}
          icon="person-remove"
          variant="secondary"
          loading={updatingStatus}
          onPress={confirmNoShow}
        />
      ) : null}

      {/* Patient summary entry — doctors only, and only when this
          appointment is linked to a medical case. */}
      {isDoctor && appointment.caseId ? (
        <Card
          onPress={() => router.push(`/case/${appointment.caseId}`)}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
        >
          <IconBadge icon="folder-open-outline" size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="sub" weight="bold">
              {t.appointmentDetails.viewCaseSummary}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t.appointmentDetails.viewCaseSummaryHint}
            </AppText>
          </View>
          <ChevronForward size={18} />
        </Card>
      ) : null}

      {/* Remote consultation entry — video appointments only */}
      {appointment.type === "VIDEO_CONSULTATION" ? (
        <VideoCard appointmentId={appointment.id} />
      ) : null}

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
        {durationMinutes > 0 ? (
          <>
            <RowDivider />
            <DetailRow
              icon="hourglass-outline"
              label={t.appointmentDetails.duration}
              value={`${durationMinutes} ${t.appointmentDetails.minutes}`}
            />
          </>
        ) : null}
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
        {!isDoctor && appointment.paymentStatus === "PAID" && appointment.paymentId ? (
          <>
            <RowDivider />
            <Pressable
              onPress={() => void onDownloadInvoice()}
              disabled={downloadingInvoice}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                paddingVertical: 4,
                opacity: downloadingInvoice ? 0.6 : 1,
              }}
            >
              {downloadingInvoice ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              )}
              <AppText variant="sub" weight="medium" color={colors.primary}>
                {t.appointmentDetails.downloadInvoice}
              </AppText>
            </Pressable>
            {downloadError ? (
              <AppText variant="caption" color={colors.danger}>
                {t.billing.receiptError}
              </AppText>
            ) : null}
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
        onPress={() => router.push("/support")}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
      >
        <IconBadge icon="chatbubbles-outline" size={40} />
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
