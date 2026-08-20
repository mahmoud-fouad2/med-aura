import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Sharing from "expo-sharing"
import { Ionicons } from "@expo/vector-icons"
import {
  AppText,
  Card,
  ChevronBack,
  EmptyState,
  Skeleton,
} from "../../components/ui"
import { QueryErrorState } from "../../components/query-error"
import {
  useCaseSummary,
  downloadDocument,
  type CaseDocument,
  type CaseSummary,
} from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { isApiErrorStatus } from "../../lib/request-errors"
import { colors, radius, spacing } from "../../theme"

const DOCUMENT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  CASE_PHOTO: "image-outline",
  MEDICAL_REPORT: "document-text-outline",
  LAB_RESULT: "flask-outline",
  ID_DOCUMENT: "card-outline",
  LICENSE: "ribbon-outline",
  CERTIFICATE: "ribbon-outline",
  OTHER: "attach-outline",
}

/**
 * Read-only patient/case summary for a doctor — reached from an
 * appointment's "Patient summary" row. The server route
 * (/api/mobile/v1/cases/[id]) enforces the exact same authorization as the
 * web dashboard's case page (active consent for a doctor viewer), so a 404
 * here always means "not shown to you," never a leaked detail about why.
 */
export default function CaseSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const query = useCaseSummary(id ?? null)

  // The server's error messages are Arabic-only regardless of the app's
  // current locale (same as every other mobile API route) — matched by the
  // literal string /api/mobile/v1/cases/[id] actually returns for "not
  // found or not authorized," not a translated copy that would never equal
  // it in English mode.
  const isNotFound = query.isError && isApiErrorStatus(query.error, 404)

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
        <AppText variant="title" weight="heavy">
          {t.caseSummary.title}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
      >
        {query.isLoading ? (
          <Card style={{ gap: spacing.md }}>
            <Skeleton style={{ width: "55%" }} />
            <Skeleton style={{ width: "40%" }} />
            <Skeleton style={{ width: "70%" }} />
          </Card>
        ) : isNotFound ? (
          <EmptyState
            icon="lock-closed-outline"
            title={t.caseSummary.notFound}
            body={t.caseSummary.notFoundHint}
          />
        ) : query.isError || !query.data ? (
          <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <Summary data={query.data} />
        )}
      </ScrollView>
    </View>
  )
}

function Summary({ data }: { data: CaseSummary }) {
  const { t } = useI18n()
  return (
    <>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="body" weight="bold">
            {data.patientName}
          </AppText>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: colors.primarySoft,
            }}
          >
            <AppText variant="caption" weight="bold" color={colors.primary}>
              {t.caseStatus[data.status] ?? data.status}
            </AppText>
          </View>
        </View>
        <AppText variant="sub" color={colors.textMuted}>
          {data.procedureName}
        </AppText>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <DetailRow icon="bookmark-outline" label={t.caseSummary.reference} value={data.reference} ltr />
        {data.centerName ? (
          <>
            <RowDivider />
            <DetailRow icon="business-outline" label={t.caseSummary.center} value={data.centerName} />
          </>
        ) : null}
        {data.goal ? (
          <>
            <RowDivider />
            <DetailRow icon="flag-outline" label={t.caseSummary.goal} value={data.goal} multiline />
          </>
        ) : null}
        {data.description ? (
          <>
            <RowDivider />
            <DetailRow
              icon="reader-outline"
              label={t.caseSummary.description}
              value={data.description}
              multiline
            />
          </>
        ) : null}
      </Card>

      <View style={{ gap: spacing.md }}>
        <AppText variant="heading" weight="bold">
          {t.caseSummary.documentsTitle}
        </AppText>
        {data.documents.length === 0 ? (
          <Card>
            <AppText variant="sub" color={colors.textMuted}>
              {t.caseSummary.noDocuments}
            </AppText>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {data.documents.map((doc, i) => (
              <View key={doc.id}>
                {i > 0 ? <RowDivider /> : null}
                <DocumentRow document={doc} />
              </View>
            ))}
          </Card>
        )}
      </View>
    </>
  )
}

function DocumentRow({ document }: { document: CaseDocument }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function onView() {
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      const fileUri = await downloadDocument(document.id, document.fileName)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: document.contentType || undefined })
      }
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Pressable
      onPress={() => void onView()}
      disabled={busy}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <Ionicons name={DOCUMENT_ICON[document.kind] ?? "attach-outline"} size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" numberOfLines={1}>
          {document.fileName}
        </AppText>
        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {t.caseSummary.documentError}
          </AppText>
        ) : busy ? (
          <AppText variant="caption" color={colors.textMuted}>
            {t.caseSummary.downloadingDocument}
          </AppText>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <AppText variant="sub" weight="medium" color={colors.primary}>
          {t.caseSummary.viewDocument}
        </AppText>
      )}
    </Pressable>
  )
}

function DetailRow({
  icon,
  label,
  value,
  ltr,
  multiline,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  ltr?: boolean
  multiline?: boolean
}) {
  if (multiline) {
    return (
      <View style={{ gap: spacing.xs, padding: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <AppText variant="sub" color={colors.textMuted}>
            {label}
          </AppText>
        </View>
        <AppText variant="body" style={{ marginStart: 30 }}>
          {value}
        </AppText>
      </View>
    )
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="sub" color={colors.textMuted} style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText
        variant="sub"
        weight="bold"
        style={ltr ? { writingDirection: "ltr" } : undefined}
      >
        {value}
      </AppText>
    </View>
  )
}

function RowDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: spacing.lg,
      }}
    />
  )
}
