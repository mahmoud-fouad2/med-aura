import { FlatList, Pressable, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  AppText,
  Card,
  ChevronBack,
  ChevronForward,
  EmptyState,
  Skeleton,
  StatusPill,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import { useMyCases, type DoctorCaseItem } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing, TAB_BAR_HEIGHT } from "../../theme"

function caseTone(status: string): "success" | "warning" | "info" | "neutral" {
  if (status === "CLOSED" || status === "CANCELLED") return "neutral"
  if (status === "PROCEDURE_COMPLETED" || status === "FOLLOW_UP") return "success"
  if (status === "MORE_INFORMATION_REQUIRED") return "warning"
  return "info"
}

/**
 * A doctor's own shared-cases list — natively replaces what used to be a
 * "Open dashboard" web hand-off from Home (both things that fallback
 * offered — appointments and shared cases — are native now, so it's gone).
 * Same data (lib/data/cases.ts's listDoctorAssignedCases) and the same
 * pending-consent handling as the web dashboard: a case the patient hasn't
 * granted consent for shows but isn't tappable, exactly like there.
 */
export default function MyCases() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useMyCases()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.md }}>
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
        <AppText variant="title" weight="heavy">
          {t.myCases.title}
        </AppText>
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
          data={query.data?.cases ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{
            padding: spacing.screen,
            paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.lg,
            gap: spacing.md,
          }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={
            <EmptyState icon="folder-open-outline" title={t.myCases.empty} body={t.myCases.emptyBody} />
          }
          renderItem={({ item }) => <CaseRow item={item} />}
        />
      )}
    </View>
  )
}

function CaseRow({ item }: { item: DoctorCaseItem }) {
  const { t } = useI18n()

  if (!item.consentActive) {
    return (
      <Card style={{ gap: spacing.xs, opacity: 0.7 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="body" weight="bold" numberOfLines={1}>
              {item.procedureName}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {item.counterpartName} · {item.reference}
            </AppText>
          </View>
          <StatusPill label={t.myCases.pendingConsent} tone="warning" />
        </View>
        <AppText variant="caption" color={colors.textFaint}>
          {t.myCases.pendingConsentHint}
        </AppText>
      </Card>
    )
  }

  return (
    <Card
      onPress={() => router.push(`/case/${item.id}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="bold" numberOfLines={1}>
          {item.procedureName}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {item.counterpartName} · {item.reference}
        </AppText>
      </View>
      <StatusPill label={t.caseStatus[item.status] ?? item.status} tone={caseTone(item.status)} />
      <ChevronForward size={18} />
    </Card>
  )
}
