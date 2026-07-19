import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Avatar,
  Card,
  ChevronForward,
  EmptyState,
  Skeleton,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import { DoctorFilterSheet } from "../../components/doctor-filter-sheet"
import {
  useDoctors,
  useFilterFacets,
  type Doctor,
  type DoctorFilters,
} from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

export default function Explore() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<DoctorFilters>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const doctors = useDoctors(query, filters)
  const facets = useFilterFacets()

  // Live search: results follow the typing after a beat — no submit needed,
  // and no request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  const rows = useMemo(
    () => doctors.data?.pages.flatMap((p) => p.doctors) ?? [],
    [doctors.data],
  )
  const total = doctors.data?.pages[0]?.total ?? 0
  const activeCount = Object.values(filters).filter((v) => v != null).length

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
          {t.explore.title}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
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
              onSubmitEditing={() => setQuery(search.trim())}
              returnKeyType="search"
              placeholder={t.explore.searchPlaceholder}
              placeholderTextColor={colors.textFaint}
              style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: colors.text }}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
          {/* Filter button — badge shows how many filters are active. */}
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t.filters.button}
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: activeCount ? colors.primary : colors.border,
              backgroundColor: activeCount ? colors.primarySoft : colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeCount ? colors.primary : colors.textMuted}
            />
            {activeCount ? (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  end: -4,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText variant="caption" weight="bold" color="#FFFFFF">
                  {activeCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Result count once any filter or search is active. */}
        {(activeCount > 0 || query) && !doctors.isLoading ? (
          <AppText variant="caption" color={colors.textMuted}>
            {total} {t.filters.results}
          </AppText>
        ) : null}
      </View>

      <DoctorFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        facets={facets.data}
        current={filters}
        onApply={setFilters}
      />

      {doctors.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 96, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : doctors.isError ? (
        <QueryErrorState error={doctors.error} onRetry={() => void doctors.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.md }}
          refreshing={doctors.isRefetching && !doctors.isFetchingNextPage}
          onRefresh={() => void doctors.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (doctors.hasNextPage && !doctors.isFetchingNextPage) {
              void doctors.fetchNextPage()
            }
          }}
          ListFooterComponent={
            doctors.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ paddingVertical: spacing.lg }}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="search-outline" title={t.explore.empty} />
          }
          renderItem={({ item }) => <DoctorRow doctor={item} />}
        />
      )}
    </View>
  )
}

function DoctorRow({ doctor }: { doctor: Doctor }) {
  const { t } = useI18n()
  const location = [doctor.city, t.countries[doctor.country] ?? doctor.country]
    .filter(Boolean)
    .join("، ")
  return (
    <Card
      onPress={() => router.push(`/doctor/${doctor.slug}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size={60} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="body" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {doctor.name}
          </AppText>
          {doctor.verified && (
            <Ionicons name="shield-checkmark" size={14} color={colors.gold} />
          )}
        </View>
        {doctor.title ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {doctor.title}
          </AppText>
        ) : null}
        <AppText variant="caption" color={colors.textFaint} numberOfLines={1}>
          {location} · {doctor.yearsExperience} {t.explore.years}
        </AppText>
      </View>
      <ChevronForward size={18} />
    </Card>
  )
}
