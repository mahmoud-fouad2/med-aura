import { FlatList, Pressable, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  AppText,
  Avatar,
  Card,
  ChevronBack,
  ChevronForward,
  EmptyState,
  Skeleton,
} from "../components/ui"
import { FavoriteHeart } from "../components/favorite-heart"
import { QueryErrorState } from "../components/query-error"
import { useFavorites, type FavoriteDoctor } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, spacing } from "../theme"

/** The signed-in user's saved doctors — one tap back into any profile, one
 *  tap on the heart to remove. */
export default function Favorites() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const favorites = useFavorites()
  const doctors = favorites.data?.doctors ?? []

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing.md,
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
        <View style={{ flex: 1 }}>
          <AppText variant="title" weight="heavy">
            {t.favorites.title}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t.favorites.subtitle}
          </AppText>
        </View>
      </View>

      {favorites.isLoading ? (
        <View style={{ paddingHorizontal: spacing.screen, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Card key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Skeleton style={{ width: 52, height: 52, borderRadius: 26 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton style={{ width: "55%" }} />
                <Skeleton style={{ width: "35%" }} />
              </View>
            </Card>
          ))}
        </View>
      ) : favorites.isError ? (
        <QueryErrorState error={favorites.error} onRetry={() => void favorites.refetch()} />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title={t.favorites.emptyTitle}
          body={t.favorites.emptyBody}
        />
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.screen,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.md,
          }}
          renderItem={({ item }) => <FavoriteRow doctor={item} />}
        />
      )}
    </View>
  )
}

function FavoriteRow({ doctor }: { doctor: FavoriteDoctor }) {
  const location = [doctor.title, doctor.city].filter(Boolean).join(" · ")
  return (
    <Card
      onPress={() => router.push(`/doctor/${doctor.slug}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="bold" numberOfLines={1}>
          {doctor.name}
        </AppText>
        {location ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {location}
          </AppText>
        ) : null}
      </View>
      <FavoriteHeart doctor={doctor} variant="plain" size={22} />
      <ChevronForward size={18} />
    </Card>
  )
}
