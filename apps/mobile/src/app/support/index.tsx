import { FlatList, Pressable, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  ChevronBack,
  EmptyState,
  Skeleton,
  StatusPill,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import { useTickets, type TicketSummary } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"

const STATUS_TONE: Record<string, "info" | "warning" | "success"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "success",
}

/** Patient/doctor self-service ticket list — mirrors the web dashboard's
 *  /dashboard/support. Staff triage stays on /admin/tickets, web-only. */
export default function SupportTickets() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useTickets()

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
          {t.tickets.title}
        </AppText>
        <Pressable
          onPress={() => router.push("/support/new")}
          accessibilityRole="button"
          accessibilityLabel={t.tickets.newTicket}
          hitSlop={8}
        >
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>

      {query.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 84, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={query.data?.tickets ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.sm }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title={t.tickets.empty}
              body={t.tickets.emptyBody}
            />
          }
          renderItem={({ item }) => (
            <TicketRow
              ticket={item}
              locale={locale}
              onPress={() => router.push(`/support/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}

function TicketRow({
  ticket,
  locale,
  onPress,
}: {
  ticket: TicketSummary
  locale: string
  onPress: () => void
}) {
  const { t } = useI18n()
  const when = new Date(ticket.lastMessageAt).toLocaleDateString(
    locale === "ar" ? "ar-SA-u-nu-latn" : "en-US",
    { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
  )
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: ticket.unreadForMe ? colors.primary : colors.border,
        backgroundColor: pressed
          ? colors.primarySoft
          : ticket.unreadForMe
            ? colors.card
            : colors.background,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <AppText
          variant="body"
          weight={ticket.unreadForMe ? "bold" : "medium"}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {ticket.subject}
        </AppText>
        {ticket.unreadForMe ? (
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
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <StatusPill
          label={t.ticketStatus[ticket.status] ?? ticket.status}
          tone={STATUS_TONE[ticket.status] ?? "neutral"}
        />
        <AppText variant="caption" color={colors.textMuted}>
          {t.ticketCategory[ticket.category ?? ""] ?? ""}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.textFaint}>
        {when}
      </AppText>
    </Pressable>
  )
}
