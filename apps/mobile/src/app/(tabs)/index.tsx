import { Pressable, RefreshControl, ScrollView, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StatusPill,
} from "../../components/ui"
import { useHome, type Appointment, type Doctor } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, shadows, spacing } from "../../theme"

export default function Home() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const home = useHome()

  const hour = new Date().getHours()
  const greeting = hour < 17 ? t.home.morning : t.home.evening

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={home.isRefetching}
          onRefresh={() => void home.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* Hero */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xxl + spacing.lg,
          paddingHorizontal: spacing.screen,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -30,
            end: -30,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: "rgba(255,255,255,0.07)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 20,
            start: -20,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: "rgba(201,162,75,0.22)",
          }}
        />
        <View style={{ gap: 4 }}>
          <AppText variant="sub" color="rgba(255,255,255,0.75)">
            {greeting}
          </AppText>
          {home.isLoading ? (
            <Skeleton style={{ width: 140, height: 26, backgroundColor: "rgba(255,255,255,0.25)" }} />
          ) : (
            <AppText variant="hero" weight="heavy" color="#FFFFFF">
              {home.data?.firstName ?? t.appName}
            </AppText>
          )}
          <AppText variant="sub" color="rgba(255,255,255,0.85)">
            {t.home.heroBody}
          </AppText>
        </View>
        <Button
          label={t.home.heroCta}
          onPress={() => router.push("/(tabs)/explore")}
          style={{
            marginTop: spacing.lg,
            backgroundColor: colors.gold,
            alignSelf: "flex-start",
            paddingVertical: 11,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.screen, gap: spacing.xl, marginTop: -spacing.xl }}>
        {/* Quick actions */}
        <View
          style={[
            {
              flexDirection: "row",
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.lg,
            },
            shadows.raised,
          ]}
        >
          <QuickAction icon="search" label={t.home.exploreAction} onPress={() => router.push("/(tabs)/explore")} />
          <QuickAction icon="calendar" label={t.home.myAppointments} onPress={() => router.push("/(tabs)/appointments")} />
          <QuickAction icon="person" label={t.home.myProfile} onPress={() => router.push("/(tabs)/profile")} />
        </View>

        {/* Next appointment */}
        <Section title={t.home.nextAppointment}>
          {home.isLoading ? (
            <Card style={{ gap: spacing.md }}>
              <Skeleton style={{ width: "60%" }} />
              <Skeleton style={{ width: "40%" }} />
            </Card>
          ) : home.isError ? (
            <ErrorCard message={t.common.loadFailed} onRetry={() => void home.refetch()} />
          ) : home.data?.nextAppointment ? (
            <AppointmentCard appointment={home.data.nextAppointment} locale={locale} statusLabels={t.status} />
          ) : (
            <Card>
              <EmptyState
                icon="calendar-outline"
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

        {/* Featured doctors */}
        <Section title={t.home.featuredDoctors}>
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
      </View>
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="heading" weight="bold">
        {title}
      </AppText>
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
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <AppText variant="caption" weight="medium" color={colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
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
    <Card style={{ gap: spacing.md }}>
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
          <Ionicons name="shield-checkmark" size={12} color={colors.gold} />
          <AppText variant="caption" weight="medium" color={colors.gold}>
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
