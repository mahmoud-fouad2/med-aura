import { useMemo, useState } from "react"
import { FlatList, Pressable, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Card,
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

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  ACCOUNT: "person-outline",
  BOOKING: "calendar-outline",
  BILLING: "card-outline",
  MEDICAL: "medkit-outline",
  TECHNICAL: "construct-outline",
  OTHER: "chatbubble-outline",
}

/** Patient/doctor self-service ticket list — mirrors the web dashboard's
 *  /dashboard/support. Staff triage stays on /admin/tickets, web-only. */
export default function SupportTickets() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useTickets()
  const [search, setSearch] = useState("")

  const allRows = useMemo(() => query.data?.tickets ?? [], [query.data])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((r) => r.subject.toLowerCase().includes(q))
  }, [allRows, search])

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

      {!query.isLoading && !query.isError && allRows.length > 0 ? (
        <View style={{ paddingHorizontal: spacing.screen, paddingBottom: spacing.md }}>
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
              placeholder={t.tickets.searchPlaceholder}
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
      ) : null}

      {query.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 92, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.screen, gap: spacing.md }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={
            search.trim() ? (
              <EmptyState icon="search-outline" title={t.tickets.noResults} />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title={t.tickets.empty}
                body={t.tickets.emptyBody}
              />
            )
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
    <Card
      onPress={onPress}
      style={{
        gap: spacing.md,
        borderColor: ticket.unreadForMe ? colors.primary : colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ flexDirection: "row", flex: 1, gap: spacing.sm }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={CATEGORY_ICON[ticket.category ?? ""] ?? "chatbubble-outline"}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText
              variant="body"
              weight={ticket.unreadForMe ? "bold" : "medium"}
              numberOfLines={1}
            >
              {ticket.subject}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {t.ticketCategory[ticket.category ?? ""] ?? ""}
            </AppText>
          </View>
        </View>
        <StatusPill
          label={t.ticketStatus[ticket.status] ?? ticket.status}
          tone={STATUS_TONE[ticket.status] ?? "neutral"}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
        }}
      >
        <AppText variant="caption" color={colors.textFaint}>
          {when}
        </AppText>
        {ticket.unreadForMe ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
        ) : null}
      </View>
    </Card>
  )
}
