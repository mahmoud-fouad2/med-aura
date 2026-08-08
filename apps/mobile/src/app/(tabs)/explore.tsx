import { memo, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, FlatList, Linking, Pressable, TextInput, View } from "react-native"
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
import { LocationPermissionSheet } from "../../components/location-permission-sheet"
import {
  useDoctors,
  useFilterFacets,
  type Doctor,
  type DoctorFilters,
} from "../../lib/api"
import { requestLocation, type Coords } from "../../lib/location"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing, TAB_BAR_HEIGHT } from "../../theme"

export default function Explore() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<DoctorFilters>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationNotice, setLocationNotice] = useState<
    { kind: "denied"; canAskAgain: boolean } | { kind: "error" } | { kind: "unavailable" } | null
  >(null)
  const facets = useFilterFacets()
  // "Nearest to me" overrides sort but never the rest of the staged filters —
  // and only ever activates once we actually have real device coordinates.
  const effectiveFilters: DoctorFilters = coords
    ? { ...filters, sort: "nearest", lat: coords.lat, lng: coords.lng }
    : filters
  const doctors = useDoctors(query, effectiveFilters)

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

  async function fetchLocation() {
    setLocationBusy(true)
    setLocationNotice(null)
    const result = await requestLocation()
    setLocationBusy(false)
    if (result.status === "granted") {
      setCoords(result.coords)
      setLocationSheetOpen(false)
    } else if (result.status === "denied") {
      setLocationSheetOpen(false)
      setLocationNotice({ kind: "denied", canAskAgain: result.canAskAgain })
    } else {
      setLocationSheetOpen(false)
      setLocationNotice({ kind: "error" })
    }
  }

  function onPressNearest() {
    if (!facets.data?.hasNearestSupport) {
      setLocationNotice({ kind: "unavailable" })
      return
    }
    setLocationNotice(null)
    if (coords) {
      void fetchLocation() // "تحديث موقعي" — permission already granted.
    } else {
      setLocationSheetOpen(true)
    }
  }

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

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm }}>
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t.filters.button}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: activeCount ? colors.primary : colors.border,
              backgroundColor: activeCount ? colors.primarySoft : colors.card,
              paddingHorizontal: spacing.md,
              paddingVertical: 8,
            }}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeCount ? colors.primary : colors.textMuted}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={activeCount ? colors.primary : colors.textMuted}
            >
              {t.filters.button}
            </AppText>
            {activeCount ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  paddingHorizontal: 5,
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

          {/* "Nearest to me" — permission requested only on this exact tap,
              never on app open. Re-tap once active re-fetches the position. */}
          {coords ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                flexGrow: 1,
                minWidth: 170,
                backgroundColor: colors.primarySoft,
                borderRadius: radius.full,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <AppText variant="caption" weight="medium" color={colors.primary} style={{ flex: 1 }}>
                {t.filters.nearestBanner}
              </AppText>
              <Pressable
                onPress={() => void fetchLocation()}
                disabled={locationBusy}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.filters.nearestUpdate}
              >
                <Ionicons name="refresh" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => setCoords(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.common.cancel}
              >
                <Ionicons name="close" size={16} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onPressNearest}
              accessibilityRole="button"
              accessibilityLabel={t.filters.nearest}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: radius.full,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
              <AppText variant="caption" weight="medium" color={colors.textMuted}>
                {t.filters.nearest}
              </AppText>
            </Pressable>
          )}

          {(activeCount > 0 || query) && !doctors.isLoading ? (
            <View
              style={{
                borderRadius: radius.full,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
              }}
            >
              <AppText variant="caption" color={colors.textMuted}>
                {total} {t.filters.results}
              </AppText>
            </View>
          ) : null}
        </View>

        {locationNotice ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: spacing.sm,
              borderRadius: radius.lg,
              padding: spacing.sm,
              backgroundColor: locationNotice.kind === "unavailable" ? colors.primarySoft : colors.card,
              borderWidth: locationNotice.kind === "unavailable" ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name={locationNotice.kind === "unavailable" ? "information-circle" : "alert-circle-outline"}
              size={14}
              color={locationNotice.kind === "unavailable" ? colors.primary : colors.textFaint}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="caption" color={locationNotice.kind === "unavailable" ? colors.primary : colors.textFaint}>
                {locationNotice.kind === "denied"
                  ? t.filters.nearestDenied
                  : locationNotice.kind === "error"
                    ? t.filters.nearestError
                    : t.filters.nearestUnavailable}
              </AppText>
              {locationNotice.kind === "denied" ? (
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Pressable onPress={() => setFilterOpen(true)} hitSlop={4}>
                    <AppText variant="caption" weight="bold" color={colors.primary}>
                      {t.filters.chooseCity}
                    </AppText>
                  </Pressable>
                  {!locationNotice.canAskAgain ? (
                    <Pressable onPress={() => void Linking.openSettings()} hitSlop={4}>
                      <AppText variant="caption" weight="bold" color={colors.primary}>
                        {t.filters.openSettings}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      <LocationPermissionSheet
        visible={locationSheetOpen}
        busy={locationBusy}
        onClose={() => setLocationSheetOpen(false)}
        onContinue={() => void fetchLocation()}
      />

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
          contentContainerStyle={{
            padding: spacing.screen,
            paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.lg,
            gap: spacing.md,
          }}
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
          renderItem={renderDoctorRow}
        />
      )}
    </View>
  )
}

// Module-level, stable reference — search-typing re-renders Explore on
// every keystroke (via the raw `search` state, ahead of the debounce), and
// an inline `renderItem` closure would get recreated each time, defeating
// FlatList's ability to skip re-rendering rows that haven't changed.
function renderDoctorRow({ item }: { item: Doctor }) {
  return <DoctorRow doctor={item} />
}

const DoctorRow = memo(function DoctorRow({ doctor }: { doctor: Doctor }) {
  const { t } = useI18n()
  const location = [doctor.city, t.countries[doctor.country] ?? doctor.country]
    .filter(Boolean)
    .join("، ")
  return (
    <Card
      onPress={() => router.push(`/doctor/${doctor.slug}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size={78} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="body" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {doctor.name}
          </AppText>
          {doctor.verified && (
            <Ionicons name="shield-checkmark" size={15} color={colors.info} />
          )}
        </View>
        {doctor.title ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {doctor.title}
          </AppText>
        ) : null}
        <AppText variant="caption" color={colors.textFaint} numberOfLines={1}>
          {location} · {doctor.yearsExperience} {t.explore.years}
          {doctor.distanceKm != null ? ` · ${doctor.distanceKm} ${t.filters.km}` : ""}
        </AppText>
      </View>
      <ChevronForward size={18} />
    </Card>
  )
})
