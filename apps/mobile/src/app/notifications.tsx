import { FlatList, Pressable, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as WebBrowser from "expo-web-browser"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  ChevronBack,
  EmptyState,
  Skeleton,
} from "../components/ui"
import { stateArt } from "../components/brand"
import { QueryErrorState } from "../components/query-error"
import { api, useNotifications, type AppNotification } from "../lib/api"
import { API_URL } from "../lib/config"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/** The user's inbox — same notifications the web dashboard shows. */
export default function Notifications() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const query = useNotifications()

  const markRead = useMutation({
    mutationFn: api.markNotificationsRead,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const open = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate({ id: n.id })
    // Video notifications stay inside the app — the appointments tab leads
    // straight to the consultation entry. Everything else opens its web page.
    if (n.type.startsWith("VIDEO_")) {
      router.push("/(tabs)/appointments")
      return
    }
    if (n.href) {
      const url = n.href.startsWith("http") ? n.href : `${API_URL}${n.href}`
      void WebBrowser.openBrowserAsync(url)
    }
  }

  const unread = query.data?.unread ?? 0

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
        <AppText variant="title" weight="heavy" style={{ flex: 1 }}>
          {t.inbox.title}
        </AppText>
        {unread > 0 ? (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              markRead.mutate({ all: true })
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <AppText variant="caption" weight="bold" color={colors.primary}>
              {t.inbox.markAll}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {query.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 76, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.notifications ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.sm }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              art={stateArt.noNotifications}
              title={t.inbox.empty}
              body={t.inbox.emptyBody}
            />
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              locale={locale}
              onPress={() => open(item)}
            />
          )}
        />
      )}
    </View>
  )
}

function NotificationRow({
  notification,
  locale,
  onPress,
}: {
  notification: AppNotification
  locale: string
  onPress: () => void
}) {
  const unread = !notification.readAt
  const created = new Date(notification.createdAt)
  const when = created.toLocaleDateString(
    locale === "ar" ? "ar-SA-u-nu-latn" : "en-US",
    { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
  )
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: unread ? colors.primary : colors.border,
        backgroundColor: pressed
          ? colors.primarySoft
          : unread
            ? colors.card
            : colors.background,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: unread ? colors.primarySoft : "#F1EFF6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={unread ? "notifications" : "notifications-outline"}
          size={17}
          color={unread ? colors.primary : colors.textMuted}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="sub" weight={unread ? "bold" : "medium"} numberOfLines={2}>
          {notification.title}
        </AppText>
        {notification.body ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
            {notification.body}
          </AppText>
        ) : null}
        <AppText variant="caption" color={colors.textFaint}>
          {when}
        </AppText>
      </View>
      {unread ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
            marginTop: 6,
          }}
        />
      ) : null}
    </Pressable>
  )
}
