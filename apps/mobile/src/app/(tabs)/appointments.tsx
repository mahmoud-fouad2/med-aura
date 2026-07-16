import { useMemo, useState } from "react"
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
import { stateArt } from "../../components/brand"
import { QueryErrorState } from "../../components/query-error"
import { useAppointments, type Appointment } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { appointmentTone } from "./index"

export default function Appointments() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const query = useAppointments()

  // Splitting upcoming/past needs the wall clock, which is impure by nature.
  // Reading it once per data change (rather than per render) keeps the list
  // stable while the user is on the screen; a pull-to-refresh re-evaluates it.
  const rows = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- clock read, intentional
    const now = Date.now()
    const all = query.data?.appointments ?? []
    return all.filter((a) =>
      tab === "upcoming"
        ? new Date(a.startsAt).getTime() >= now
        : new Date(a.startsAt).getTime() < now,
    )
  }, [query.data, tab])

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
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
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
              art={stateArt.noAppointments}
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
