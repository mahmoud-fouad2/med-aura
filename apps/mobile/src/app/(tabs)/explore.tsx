import { useState } from "react"
import { FlatList, TextInput, View } from "react-native"
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
import { useDoctors, type Doctor } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

export default function Explore() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const doctors = useDoctors(query)

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
        </View>
      </View>

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
          data={doctors.data?.doctors ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.md }}
          refreshing={doctors.isRefetching}
          onRefresh={() => void doctors.refetch()}
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
