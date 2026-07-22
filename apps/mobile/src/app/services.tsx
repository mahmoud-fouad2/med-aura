import { useEffect, useMemo, useState } from "react"
import { FlatList, Pressable, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Card,
  ChevronBack,
  ChevronForward,
  EmptyState,
  Skeleton,
} from "../components/ui"
import { ServiceThumbnail } from "../components/service-thumbnail"
import { QueryErrorState } from "../components/query-error"
import { useMe, useServices, type Service } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/**
 * Native services (procedures) catalogue. Card-per-service with a soft brand
 * illustration (no per-service photos exist), specialty badge, doctor count,
 * and a "price after consultation" note — this platform never lists a fixed
 * price. Booking is patient-only (gated in the details screen).
 */
export default function Services() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const services = useServices(query)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  const rows = useMemo(() => services.data?.services ?? [], [services.data])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.md,
      }}
    >
      <View style={{ paddingHorizontal: spacing.screen, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            hitSlop={8}
          >
            <ChevronBack size={22} />
          </Pressable>
          <AppText variant="title" weight="heavy">
            {t.services.title}
          </AppText>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.services.searchPlaceholder}
            placeholderTextColor={colors.textFaint}
            style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: colors.text }}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {services.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 108, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : services.isError ? (
        <QueryErrorState error={services.error} onRetry={() => void services.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(s) => s.slug}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.md }}
          refreshing={services.isRefetching}
          onRefresh={() => void services.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="sparkles-outline"
              title={t.services.empty}
              body={t.services.emptyBody}
            />
          }
          renderItem={({ item }) => <ServiceRow service={item} />}
        />
      )}
    </View>
  )
}

function ServiceRow({ service }: { service: Service }) {
  const { t } = useI18n()
  const me = useMe()
  const isPatient = (me.data?.accountType ?? "patient") === "patient"

  return (
    <Card onPress={() => router.push(`/service/${service.slug}`)} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <ServiceThumbnail uri={service.imageUrl} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="body" weight="bold" numberOfLines={1}>
            {service.nameAr}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Badge label={service.categoryNameAr} tone="primary" />
            <Badge
              label={service.isSurgical ? t.services.surgical : t.services.nonSurgical}
              tone="neutral"
            />
          </View>
          {service.descriptionAr ? (
            <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
              {service.descriptionAr}
            </AppText>
          ) : null}
        </View>
        <ChevronForward size={18} />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted}>
            {service.doctorCount} {t.services.doctorsAvailable}
          </AppText>
        </View>
        <AppText variant="caption" weight="medium" color={colors.gold}>
          {isPatient ? t.services.viewDetails : t.services.aboutService}
        </AppText>
      </View>
    </Card>
  )
}

function Badge({ label, tone }: { label: string; tone: "primary" | "neutral" }) {
  return (
    <View
      style={{
        borderRadius: radius.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: tone === "primary" ? colors.primarySoft : "#F1EFF6",
      }}
    >
      <AppText
        variant="caption"
        weight="medium"
        color={tone === "primary" ? colors.primary : colors.textMuted}
      >
        {label}
      </AppText>
    </View>
  )
}
