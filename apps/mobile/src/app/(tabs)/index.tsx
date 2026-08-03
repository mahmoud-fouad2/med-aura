import { Pressable, RefreshControl, ScrollView, View } from "react-native"
import { router } from "expo-router"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  IconBadge,
  SectionHeading,
  Skeleton,
  StatusPill,
} from "../../components/ui"
import { brandAssets, stateArt } from "../../components/brand"
import {
  NetworkError,
  useHome,
  useMe,
  useNotifications,
  type Appointment,
  type Doctor,
} from "../../lib/api"
import { authClient } from "../../lib/auth-client"
import { useI18n } from "../../lib/i18n"
import { colors, radius, shadows, spacing, TAB_BAR_HEIGHT } from "../../theme"

export default function Home() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const me = useMe()
  const home = useHome()
  const inbox = useNotifications()
  // The greeting must always be a person's name, never the brand's — and for
  // a doctor it must be their provider name with the "د." title, never a bare
  // title. `displayName`/`doctorName` come resolved from /me.
  const session = authClient.useSession()
  const accountType = me.data?.accountType ?? "patient"
  const isPatient = accountType === "patient"
  const todaysAppointments = home.data?.todaysAppointments ?? []

  const resolvedName = (
    me.data?.displayName ??
    home.data?.firstName ??
    session.data?.user?.name ??
    ""
  ).trim()
  const patientFirstName = resolvedName.split(/\s+/)[0] ?? ""
  const doctorName = me.data?.doctorName?.trim() ?? ""
  // What the hero prints: "د. أحمد …" for a named doctor, the first name for a
  // patient, and a warm generic fallback when no name is known — never "".
  const heroName =
    accountType === "doctor"
      ? doctorName
        ? `${t.home.doctorTitle} ${doctorName}`
        : t.home.welcomeFallback
      : patientFirstName || t.home.welcomeFallback

  const hour = new Date().getHours()
  const greeting = hour < 17 ? t.home.morning : t.home.evening

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.lg }}
      refreshControl={
        <RefreshControl
          refreshing={home.isRefetching}
          onRefresh={() => void home.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* Hero — brand artwork behind the greeting, not a flat colour block. */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxl + spacing.lg,
          paddingHorizontal: spacing.screen,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          backgroundColor: colors.primary,
          overflow: "hidden",
        }}
      >
        <Image
          source={brandAssets.homeHero}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          contentFit="cover"
        />
        {/* Two clean corners — avatar and the bell each get their own,
            rather than clustering together and leaving the (now removed)
            tiny logo to hold down the opposite corner alone. The brand
            moment lives on the splash screen instead, at real size. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={t.inbox.title}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.16)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
            {(inbox.data?.unread ?? 0) > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  end: -2,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: colors.gold,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText variant="caption" weight="bold" color={colors.ink}>
                  {Math.min(inbox.data?.unread ?? 0, 9)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel={t.home.myProfile}
            hitSlop={8}
            style={{ borderRadius: 19, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" }}
          >
            <Avatar name={resolvedName || "؟"} photoUrl={me.data?.photoUrl} size={34} />
          </Pressable>
        </View>
        <View style={{ gap: 4 }}>
          <AppText variant="sub" color="rgba(255,255,255,0.75)">
            {greeting}
          </AppText>
          {(me.isLoading || home.isLoading) && !resolvedName ? (
            <Skeleton style={{ width: 140, height: 26, backgroundColor: "rgba(255,255,255,0.25)" }} />
          ) : (
            <AppText variant="hero" weight="heavy" color="#FFFFFF">
              {heroName}
            </AppText>
          )}
          <AppText variant="sub" color="rgba(255,255,255,0.85)">
            {isPatient ? t.home.heroBody : t.home.heroBodyProvider}
          </AppText>
        </View>
        {/* Only patients book — never show a booking CTA to a doctor/staff. */}
        {isPatient ? (
          <Button
            label={t.home.heroCta}
            onPress={() => router.push("/(tabs)/explore")}
            style={[
              {
                marginTop: spacing.lg,
                backgroundColor: colors.gold,
                alignSelf: "flex-start",
                borderRadius: radius.full,
                paddingVertical: 17,
                paddingHorizontal: spacing.xxl,
              },
              shadows.raised,
            ]}
          />
        ) : null}
      </View>

      {/* Provider (doctor/staff): today's-schedule, next patient, and shared
          cases are all native now. Availability/calendar editing has no
          editor anywhere yet — admin or self-service — so there's
          deliberately no link standing in for a feature that doesn't
          exist on either platform. */}
      {!isPatient ? (
        <View style={{ paddingHorizontal: spacing.screen, gap: spacing.xl, marginTop: -spacing.xl }}>
          {/* Stats */}
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard
              icon="today-outline"
              value={home.data?.todayCount ?? 0}
              label={t.home.todayAppointments}
              loading={home.isLoading}
            />
            <StatCard
              icon="calendar-outline"
              value={home.data?.upcomingCount ?? 0}
              label={t.home.totalUpcoming}
              loading={home.isLoading}
            />
          </View>

          {/* Today's schedule — the full list already fetched for the stat
              card above, previously computed and thrown away. The most
              actionable view for a doctor starting their day. */}
          {todaysAppointments.length > 0 ? (
            <Section title={t.home.todaysSchedule} icon="today-outline">
              <View style={{ gap: spacing.md }}>
                {todaysAppointments.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} locale={locale} statusLabels={t.status} />
                ))}
              </View>
            </Section>
          ) : null}

          {/* Next patient */}
          <Section title={t.home.nextPatientAppointment} icon="calendar-outline">
            {home.isLoading ? (
              <Card style={{ gap: spacing.md }}>
                <Skeleton style={{ width: "60%" }} />
                <Skeleton style={{ width: "40%" }} />
              </Card>
            ) : home.isError ? (
              <ErrorCard
                message={
                  home.error instanceof NetworkError
                    ? t.common.offline
                    : t.common.loadFailed
                }
                onRetry={() => void home.refetch()}
              />
            ) : home.data?.nextAppointment ? (
              <AppointmentCard appointment={home.data.nextAppointment} locale={locale} statusLabels={t.status} />
            ) : (
              <Card>
                <EmptyState
                  icon="calendar-outline"
                  art={stateArt.noAppointments}
                  title={t.home.noUpcomingPatients}
                />
              </Card>
            )}
          </Section>

          <Button
            label={t.home.viewAllAppointments}
            variant="secondary"
            onPress={() => router.push("/(tabs)/appointments")}
          />
          <Button
            label={t.myCases.title}
            icon="folder-open-outline"
            variant="ghost"
            onPress={() => router.push("/cases")}
          />
        </View>
      ) : (
      <View style={{ paddingHorizontal: spacing.screen, gap: spacing.xl, marginTop: -spacing.xl }}>
        {/* Quick actions — a 2x2 grid rather than a cramped single row gives
            each action real tap-target weight and lets the label sit beside
            its icon instead of underneath it. */}
        <View
          style={[
            {
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.sm,
            },
            shadows.raised,
          ]}
        >
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <QuickAction icon="medkit-outline" label={t.home.exploreAction} onPress={() => router.push("/(tabs)/explore")} />
            <QuickAction icon="sparkles-outline" label={t.services.title} onPress={() => router.push("/services")} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <QuickAction icon="calendar-outline" label={t.home.myAppointments} onPress={() => router.push("/(tabs)/appointments")} />
            <QuickAction icon="person-outline" label={t.home.myProfile} onPress={() => router.push("/(tabs)/profile")} />
          </View>
        </View>

        {/* Next appointment */}
        <Section title={t.home.nextAppointment} icon="calendar-outline">
          {home.isLoading ? (
            <Card style={{ gap: spacing.md }}>
              <Skeleton style={{ width: "60%" }} />
              <Skeleton style={{ width: "40%" }} />
            </Card>
          ) : home.isError ? (
            <ErrorCard
              message={
                home.error instanceof NetworkError
                  ? t.common.offline
                  : t.common.loadFailed
              }
              onRetry={() => void home.refetch()}
            />
          ) : home.data?.nextAppointment ? (
            <AppointmentCard appointment={home.data.nextAppointment} locale={locale} statusLabels={t.status} />
          ) : (
            <Card>
              <EmptyState
                icon="calendar-outline"
                art={stateArt.noAppointments}
                title={t.home.noUpcoming}
                body={t.home.bookFirst}
                action={
                  <Button
                    label={t.home.heroCta}
                    variant="secondary"
                    onPress={() => router.push("/(tabs)/explore")}
                  />
                }
              />
            </Card>
          )}
        </Section>

        {/* Featured doctors — hidden on failure: the next-appointment card
            already carries the error + retry, one message is enough. */}
        {home.isError ? null : (
        <Section title={t.home.featuredDoctors} icon="star-outline">
          {home.isLoading ? (
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Skeleton style={{ flex: 1, height: 150, borderRadius: radius.xl }} />
              <Skeleton style={{ flex: 1, height: 150, borderRadius: radius.xl }} />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {(home.data?.featuredDoctors ?? []).map((d) => (
                <FeaturedDoctor key={d.id} doctor={d} verifiedLabel={t.explore.verified} />
              ))}
            </ScrollView>
          )}
        </Section>
        )}
      </View>
      )}
    </ScrollView>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {icon ? (
        <SectionHeading icon={icon} title={title} />
      ) : (
        <AppText variant="heading" weight="bold">
          {title}
        </AppText>
      )}
      {children}
    </View>
  )
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
        },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
    >
      <AppText variant="sub" weight="medium">
        {label}
      </AppText>
      <IconBadge icon={icon} size={46} />
    </Pressable>
  )
}

function StatCard({
  icon,
  value,
  label,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: number
  label: string
  loading: boolean
}) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: 6,
        },
        shadows.raised,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      {loading ? (
        <Skeleton style={{ width: 32, height: 24 }} />
      ) : (
        <AppText variant="title" weight="heavy">
          {value}
        </AppText>
      )}
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  )
}

export function appointmentTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success"
  if (status.startsWith("PENDING") || status === "RESCHEDULED") return "warning"
  if (status.startsWith("CANCELLED") || status === "NO_SHOW") return "danger"
  return "neutral"
}

function AppointmentCard({
  appointment,
  locale,
  statusLabels,
}: {
  appointment: Appointment
  locale: string
  statusLabels: Record<string, string>
}) {
  const starts = new Date(appointment.startsAt)
  const dateStr = starts.toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const timeStr = starts.toLocaleTimeString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return (
    <Card
      onPress={() => router.push(`/appointment/${appointment.id}`)}
      style={{ gap: spacing.md }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Avatar name={appointment.counterpartName} photoUrl={appointment.counterpartPhotoUrl} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="bold">
            {appointment.counterpartName}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {dateStr} · {timeStr}
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

function FeaturedDoctor({ doctor, verifiedLabel }: { doctor: Doctor; verifiedLabel: string }) {
  return (
    <Card
      onPress={() => router.push(`/doctor/${doctor.slug}`)}
      style={{ width: 170, alignItems: "center", gap: spacing.sm }}
    >
      <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size={64} />
      <View style={{ alignItems: "center", gap: 2 }}>
        <AppText variant="sub" weight="bold" numberOfLines={1} style={{ textAlign: "center" }}>
          {doctor.name}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1} style={{ textAlign: "center" }}>
          {doctor.title ?? ""}
        </AppText>
      </View>
      {doctor.verified && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="shield-checkmark" size={12} color={colors.info} />
          <AppText variant="caption" weight="medium" color={colors.info}>
            {verifiedLabel}
          </AppText>
        </View>
      )}
    </Card>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={{ alignItems: "center", gap: spacing.md }}>
      <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
        {message}
      </AppText>
      <Button label="↻" variant="secondary" onPress={onRetry} style={{ paddingVertical: 8 }} />
    </Card>
  )
}
