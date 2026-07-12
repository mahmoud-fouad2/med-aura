import { useState } from "react"
import { FlatList, Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import {
  AppText,
  Avatar,
  Card,
  EmptyState,
  Skeleton,
  StatusPill,
} from "../../components/ui"
import { useAppointments, type Appointment } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { appointmentTone } from "./index"

export default function Appointments() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const query = useAppointments()

  const now = Date.now()
  const all = query.data?.appointments ?? []
  const rows = all.filter((a) =>
    tab === "upcoming"
      ? new Date(a.startsAt).getTime() >= now
      : new Date(a.startsAt).getTime() < now,
  )

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.md,
      }}
    >
      <View style={{ paddingHorizontal: spacing.screen, gap: spacing.md }}>
        <AppText variant="title" weight="heavy">
          {t.appointments.title}
        </AppText>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F1EFF6",
            borderRadius: radius.lg,
            padding: 4,
          }}
        >
          {(["upcoming", "past"] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                void Haptics.selectionAsync()
                setTab(k)
              }}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: radius.md,
                alignItems: "center",
                backgroundColor: tab === k ? colors.card : "transparent",
              }}
            >
              <AppText
                variant="sub"
                weight={tab === k ? "bold" : "medium"}
                color={tab === k ? colors.primary : colors.textMuted}
              >
                {t.appointments[k]}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {query.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} style={{ height: 88, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t.common.loadFailed}
          action={
            <AppText
              variant="sub"
              weight="bold"
              color={colors.primary}
              onPress={() => void query.refetch()}
            >
              {t.common.retry}
            </AppText>
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.md }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={
                tab === "upcoming"
                  ? t.appointments.emptyUpcoming
                  : t.appointments.emptyPast
              }
            />
          }
          renderItem={({ item }) => (
            <AppointmentRow appointment={item} locale={locale} statusLabels={t.status} />
          )}
        />
      )}
    </View>
  )
}

function AppointmentRow({
  appointment,
  locale,
  statusLabels,
}: {
  appointment: Appointment
  locale: string
  statusLabels: Record<string, string>
}) {
  const starts = new Date(appointment.startsAt)
  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Avatar
          name={appointment.counterpartName}
          photoUrl={appointment.counterpartPhotoUrl}
          size={48}
        />
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="bold" numberOfLines={1}>
            {appointment.counterpartName}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {starts.toLocaleDateString(intl, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            ·{" "}
            {starts.toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit" })}
          </AppText>
        </View>
        <StatusPill
          label={statusLabels[appointment.status] ?? appointment.status}
          tone={appointmentTone(appointment.status)}
        />
      </View>
    </Card>
  )
}
