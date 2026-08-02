import { useMemo, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Sharing from "expo-sharing"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Card, ChevronBack, EmptyState, IconBadge, Skeleton, StatusPill } from "../components/ui"
import { QueryErrorState } from "../components/query-error"
import { usePayments, downloadInvoicePdf, type Payment } from "../lib/api"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/**
 * A summary card at the top of the list — matches the Stitch reference's
 * prominent purple balance card, but shows only real, honest totals (a
 * transaction count, and a paid-amount sum). The reference's card also has
 * a "Pay All" CTA for an outstanding balance — that assumes an in-app
 * payment-collection flow this app doesn't have (payments happen via
 * Stripe Checkout during booking, not as a later balance settlement), so
 * it's deliberately not reproduced here rather than faked as a dead button.
 */
function BillingSummaryCard({ payments }: { payments: Payment[] }) {
  const { t } = useI18n()
  const paid = payments.filter((p) => p.status === "PAID")
  // Summing across mixed currencies would produce a meaningless number —
  // only show a total when every paid entry shares one currency (the
  // overwhelmingly common real case).
  const currencies = new Set(paid.map((p) => p.currency))
  const total =
    currencies.size === 1 && paid.length > 0
      ? paid.reduce((sum, p) => sum + Number(p.amount), 0)
      : null

  return (
    <View style={{ paddingHorizontal: spacing.screen, paddingBottom: spacing.md }}>
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.xl,
          padding: spacing.xl,
          alignItems: "center",
          gap: 4,
        }}
      >
        <AppText variant="sub" color="rgba(255,255,255,0.75)">
          {payments.length} {t.billing.summaryCount}
        </AppText>
        {total != null ? (
          <AppText variant="hero" weight="heavy" color="#FFFFFF" style={{ writingDirection: "ltr" }}>
            {total.toLocaleString()} {paid[0].currency}
          </AppText>
        ) : null}
        <AppText variant="caption" color="rgba(255,255,255,0.65)">
          {t.billing.summaryPaidLabel}
        </AppText>
      </View>
    </View>
  )
}

function paymentTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "PAID") return "success"
  if (status === "FAILED" || status === "DISPUTED") return "danger"
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED") return "neutral"
  if (status === "CANCELLED") return "neutral"
  return "warning"
}

/** Icon per payment purpose/type — a plain amount+date row otherwise reads identically for every entry. */
function paymentIcon(payment: Payment): keyof typeof Ionicons.glyphMap {
  if (payment.appointmentType === "VIDEO_CONSULTATION") return "videocam-outline"
  if (payment.appointmentType === "IN_PERSON_CONSULTATION") return "medkit-outline"
  if (payment.purpose === "DEPOSIT") return "wallet-outline"
  if (payment.purpose === "FINAL_PAYMENT" || payment.purpose === "PARTIAL_PAYMENT") return "card-outline"
  return "receipt-outline"
}

/**
 * A patient's own payment/billing history — reached from Profile. Never
 * shown to a doctor viewer (billing is patient-only, matching
 * decideInvoiceAccess on the web); the backend scopes every row to the
 * caller's own payments regardless, so there's no data-leak risk either way.
 */
export default function Billing() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const query = usePayments()
  const [search, setSearch] = useState("")
  const payments = query.data?.payments
  const allRows = useMemo(() => payments ?? [], [payments])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((p) =>
      [p.serviceNameAr, p.serviceNameEn, p.doctorName, p.centerName, p.reference]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
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
        <AppText variant="title" weight="heavy">
          {t.billing.title}
        </AppText>
      </View>

      {!query.isLoading && !query.isError && allRows.length > 0 ? (
        <BillingSummaryCard payments={allRows} />
      ) : null}

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
              placeholder={t.billing.searchPlaceholder}
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
            <Skeleton key={i} style={{ height: 96, borderRadius: radius.xl }} />
          ))}
        </View>
      ) : query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.paymentId}
          contentContainerStyle={{
            padding: spacing.screen,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.md,
          }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListEmptyComponent={
            search.trim() ? (
              <EmptyState icon="search-outline" title={t.billing.noResults} />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title={t.billing.empty}
                body={t.billing.emptyBody}
              />
            )
          }
          renderItem={({ item }) => <PaymentCard payment={item} locale={locale} />}
        />
      )}
    </View>
  )
}

function PaymentCard({ payment, locale }: { payment: Payment; locale: string }) {
  const { t } = useI18n()
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(false)

  const intl = locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
  const date = payment.paidAt ?? payment.createdAt
  const dateStr = new Date(date).toLocaleDateString(intl, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const serviceLabel =
    (locale === "ar" ? payment.serviceNameAr : payment.serviceNameEn) ??
    (payment.appointmentType === "VIDEO_CONSULTATION"
      ? t.booking.typeVideo
      : payment.appointmentType === "IN_PERSON_CONSULTATION"
        ? t.booking.typeInPerson
        : t.paymentPurpose[payment.purpose] ?? payment.purpose)

  async function onDownload() {
    if (downloading) return
    setDownloading(true)
    setError(false)
    try {
      const fileUri = await downloadInvoicePdf(payment.paymentId)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" })
      }
    } catch {
      setError(true)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ flexDirection: "row", flex: 1, gap: spacing.sm }}>
          <IconBadge icon={paymentIcon(payment)} size={38} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="body" weight="bold" numberOfLines={1}>
              {serviceLabel}
            </AppText>
            {payment.doctorName || payment.centerName ? (
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                {[payment.doctorName, payment.centerName].filter(Boolean).join(" · ")}
              </AppText>
            ) : null}
          </View>
        </View>
        <StatusPill
          label={t.paymentStatus[payment.status] ?? payment.status}
          tone={paymentTone(payment.status)}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="caption" color={colors.textFaint}>
          {dateStr}
        </AppText>
        <AppText variant="body" weight="heavy" style={{ writingDirection: "ltr" }}>
          {payment.amount} {payment.currency}
        </AppText>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
          gap: spacing.md,
        }}
      >
        <AppText variant="caption" color={colors.textFaint} style={{ writingDirection: "ltr" }} selectable>
          {payment.reference}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          {payment.appointmentId ? (
            <Pressable
              onPress={() => router.push(`/appointment/${payment.appointmentId}`)}
              accessibilityRole="button"
            >
              <AppText variant="caption" weight="bold" color={colors.primary}>
                {t.billing.viewAppointment}
              </AppText>
            </Pressable>
          ) : null}
          {payment.status === "PAID" ? (
            <Pressable
              onPress={() => void onDownload()}
              disabled={downloading}
              accessibilityRole="button"
              style={{ flexDirection: "row", alignItems: "center", gap: 4, opacity: downloading ? 0.6 : 1 }}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={15} color={colors.primary} />
              )}
              <AppText variant="caption" weight="bold" color={colors.primary}>
                {t.billing.downloadReceipt}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {t.billing.receiptError}
        </AppText>
      ) : null}
    </Card>
  )
}
