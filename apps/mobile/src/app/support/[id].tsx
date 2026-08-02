import { useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { api, useTicket, type TicketMessage } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { inputStyle } from "../sign-in"

const STATUS_TONE: Record<string, "info" | "warning" | "success"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "success",
}

/**
 * Ticket thread + reply — mirrors the web dashboard's
 * /dashboard/support/[id] + components/support/ticket-thread.tsx. The
 * server (/api/mobile/v1/tickets/[id]) enforces the same participant check
 * as the web page, so a 404 here always means "not shown to you." Reply is
 * client-hidden once CLOSED, matching the web thread's own behavior — the
 * server still allows it, same as web.
 */
export default function TicketThread() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const query = useTicket(id ?? "")
  const [reply, setReply] = useState("")
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  const sendReply = useMutation({
    mutationFn: () => api.replyTicket(id as string, reply.trim()),
    onSuccess: () => {
      setReply("")
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ["ticket", id] })
      void queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onError: () => setError(t.tickets.replyError),
  })

  // Same technique as the case-summary screen: the server's Arabic message
  // is the only signal for "not found / not a participant" — never a
  // translated copy that would fail to match in English mode.
  const isNotFound =
    query.isError && query.error instanceof Error && query.error.message === "التذكرة غير موجودة."
  const closed = query.data?.status === "CLOSED"

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
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
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="body" weight="bold" numberOfLines={1}>
            {query.data?.subject ?? t.tickets.title}
          </AppText>
          {query.data ? (
            <StatusPill
              label={t.ticketStatus[query.data.status] ?? query.data.status}
              tone={STATUS_TONE[query.data.status] ?? "neutral"}
            />
          ) : null}
        </View>
      </View>

      {query.isLoading ? (
        <View style={{ padding: spacing.screen, gap: spacing.md }}>
          <Skeleton style={{ height: 60, width: "75%", borderRadius: radius.xl }} />
          <Skeleton style={{ height: 60, width: "70%", borderRadius: radius.xl, alignSelf: "flex-end" }} />
          <Skeleton style={{ height: 60, width: "60%", borderRadius: radius.xl }} />
        </View>
      ) : isNotFound ? (
        <EmptyState icon="lock-closed-outline" title={t.tickets.notFound} />
      ) : query.isError || !query.data ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: spacing.screen, gap: spacing.md }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {query.data.messages.map((m) => (
              <MessageBubble key={m.id} message={m} locale={locale} />
            ))}
          </ScrollView>

          <View
            style={{
              padding: spacing.screen,
              paddingBottom: insets.bottom + spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: spacing.sm,
            }}
          >
            {error ? (
              <AppText variant="caption" color={colors.danger}>
                {error}
              </AppText>
            ) : null}
            {closed ? (
              <AppText variant="sub" color={colors.textMuted} style={{ textAlign: "center" }}>
                {t.tickets.closedNotice}
              </AppText>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder={t.tickets.replyPlaceholder}
                  placeholderTextColor={colors.textFaint}
                  style={[inputStyle, { flex: 1, maxHeight: 100 }]}
                  multiline
                  maxLength={5000}
                />
                <Pressable
                  onPress={() => reply.trim() && sendReply.mutate()}
                  disabled={!reply.trim() || sendReply.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={t.tickets.sendReply}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.full,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: !reply.trim() || sendReply.isPending ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

function MessageBubble({ message, locale }: { message: TicketMessage; locale: string }) {
  const when = new Date(message.createdAt).toLocaleDateString(
    locale === "ar" ? "ar-SA-u-nu-latn" : "en-US",
    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  )
  return (
    <View style={{ alignSelf: message.mine ? "flex-end" : "flex-start", maxWidth: "82%", gap: 4 }}>
      {!message.mine ? (
        <AppText variant="caption" weight="bold" color={colors.textMuted}>
          {message.senderName}
        </AppText>
      ) : null}
      <View
        style={{
          padding: spacing.md,
          borderRadius: radius.xl,
          backgroundColor: message.mine ? colors.primary : colors.card,
          borderWidth: message.mine ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <AppText variant="sub" color={message.mine ? "#FFFFFF" : colors.text}>
          {message.body}
        </AppText>
      </View>
      <AppText
        variant="caption"
        color={colors.textFaint}
        style={{ alignSelf: message.mine ? "flex-end" : "flex-start" }}
      >
        {when}
      </AppText>
    </View>
  )
}
