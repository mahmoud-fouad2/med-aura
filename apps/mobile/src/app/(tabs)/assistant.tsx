import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { AppText, Avatar } from "../../components/ui"
import { AiDoctor } from "../../components/ai-doctor"
import {
  ApiError,
  NetworkError,
  RateLimitedError,
  streamAssistant,
  TimeoutError,
  type AssistantDoctor,
  type AssistantStage,
  type AssistantTurn,
} from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import {
  ASSISTANT_CONTEXT_LIMIT,
  ASSISTANT_VISIBLE_LIMIT,
  keepRecentItems,
} from "../../lib/assistant-context"
import { colors, radius, shadows, spacing } from "../../theme"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  sentAt: number
  doctors?: AssistantDoctor[]
  followups?: string[]
}

function formatTime(ms: number, locale: "ar" | "en"): string {
  return new Date(ms).toLocaleTimeString(locale === "ar" ? "ar" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

let idCounter = 0
const nextId = () => `m${++idCounter}`

export default function Assistant() {
  const { t, locale } = useI18n()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [stage, setStage] = useState<AssistantStage | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // Only auto-scroll once a conversation exists. Firing this on the empty
  // state scrolled the hero off the top of the screen on first open.
  const hasMessages = messages.length > 0
  const scrollToEnd = useCallback(() => {
    if (!hasMessages) return
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
  }, [hasMessages])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return
      void Haptics.selectionAsync()
      const userMsg: ChatMessage = { id: nextId(), role: "user", content: trimmed, sentAt: Date.now() }
      const history = keepRecentItems([...messages, userMsg], ASSISTANT_VISIBLE_LIMIT)
      setMessages(history)
      setInput("")
      setSending(true)
      setStage("understanding")
      scrollToEnd()
      try {
        const turns = keepRecentItems<AssistantTurn>(
          history.map((m) => ({ role: m.role, content: m.content })),
          ASSISTANT_CONTEXT_LIMIT,
        )
        const res = await streamAssistant(turns, setStage)
        setMessages((prev) => keepRecentItems([
          ...prev, {
            id: nextId(),
            role: "assistant",
            content: res.reply || t.assistant.error,
            sentAt: Date.now(),
            doctors: res.doctors,
            followups: res.followups,
          },
        ], ASSISTANT_VISIBLE_LIMIT))
      } catch (err) {
        // A timeout is NOT "you're offline" — the server was reachable and
        // simply took too long, so say that instead of sending the user to
        // check their connection. TimeoutError extends NetworkError, so it
        // must be tested first. A rate limit isn't a failure at all — it's
        // the provider's own quota, so it gets its own honest message.
        let msg = t.assistant.error
        if (err instanceof RateLimitedError) msg = t.assistant.rateLimited
        else if (err instanceof TimeoutError) msg = t.assistant.slow
        else if (err instanceof ApiError && err.code === "ASSISTANT_INTERRUPTED") {
          msg = t.assistant.interrupted
        } else if (err instanceof ApiError && err.code === "ASSISTANT_UNAVAILABLE") {
          msg = t.assistant.unavailable
        } else if (err instanceof NetworkError) msg = t.assistant.connection
        setMessages((prev) => keepRecentItems([
          ...prev,
          { id: nextId(), role: "assistant", content: msg, sentAt: Date.now() },
        ], ASSISTANT_VISIBLE_LIMIT))
      } finally {
        setSending(false)
        setStage(null)
        scrollToEnd()
      }
    },
    [messages, sending, scrollToEnd, t],
  )

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages],
  )
  const activeFollowups = !sending ? (lastAssistant?.followups ?? []) : []
  const showStarterChips = messages.length === 0 && !sending
  const chips = showStarterChips ? t.assistant.starters : activeFollowups

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Brand header — soft purple wash with the assistant identity front and
          center so the chat feels like a room, not a settings screen. */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.screen,
          backgroundColor: colors.primary,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={[
              {
                borderRadius: 27,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.5)",
                backgroundColor: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              },
              shadows.raised,
            ]}
          >
            <AiDoctor size={46} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="heavy" color={colors.onPrimary}>
              {t.assistant.title}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.78)">
              {t.assistant.subtitle}
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          // flexGrow lets the empty-state hero centre itself in the full
          // remaining height instead of clinging to the top of the screen.
          flexGrow: 1,
          justifyContent: messages.length === 0 ? "center" : "flex-start",
          paddingTop: spacing.lg,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.lg,
          gap: spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} text={m.content} time={formatTime(m.sentAt, locale)} />
            ) : (
              <AssistantMessage
                key={m.id}
                text={m.content}
                time={formatTime(m.sentAt, locale)}
                doctors={m.doctors ?? []}
                doctorsLabel={t.assistant.recommendedDoctors}
              />
            ),
          )
        )}

        {sending ? (
          <TypingIndicator label={stage ? t.assistant.stages[stage] : t.assistant.thinking} />
        ) : null}
      </ScrollView>

      {/* Suggestion chips — starters when empty, follow-ups after a reply. */}
      {chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Without an explicit flexGrow:0 this horizontal strip stretched to
          // fill the column, turning each pill into a full-height oval.
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: spacing.screen,
            gap: spacing.sm,
            paddingBottom: spacing.sm,
            paddingTop: spacing.xs,
          }}
        >
          {chips.map((chip, i) => (
            <SuggestionChip key={`${chip}-${i}`} label={chip} onPress={() => void send(chip)} />
          ))}
        </ScrollView>
      ) : null}

      {/* Input bar — cleaner floating shape, single circular send. */}
      <View
        style={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.sm,
          // The tab navigator already reserves its own height (the tab bar is
          // not absolutely positioned), so adding TAB_BAR_HEIGHT + insets here
          // double-counted it and left a dead gap under the input.
          paddingBottom: spacing.sm,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: spacing.sm,
            backgroundColor: colors.background,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t.assistant.placeholder}
            placeholderTextColor={colors.textFaint}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              paddingTop: 10,
              paddingBottom: 10,
              paddingHorizontal: 4,
              fontSize: 15,
              color: colors.text,
              writingDirection: "auto",
            }}
          />
          <Pressable
            onPress={() => void send(input)}
            disabled={!input.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel={t.assistant.send}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor:
                  input.trim() && !sending ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 2,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

/**
 * The empty-state hero on first open — introduces the assistant, sets the
 * expectation ("guidance, not diagnosis"), and hands the user the starter
 * chips below. A single balanced hero beats scattered helper text.
 */
function EmptyState() {
  const { t } = useI18n()
  return (
    <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.lg }}>
      {/* The character at hero size — the moment the assistant stops being an
          icon and becomes someone the patient is talking to. The title is
          deliberately NOT repeated here; the header above already carries it. */}
      <AiDoctor size={120} glow />
      <AppText
        variant="body"
        color={colors.textMuted}
        style={{ textAlign: "center", maxWidth: 320 }}
      >
        {t.assistant.greeting}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: colors.primarySoft,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
        <AppText variant="caption" color={colors.primary} style={{ flex: 1 }}>
          {t.assistant.disclaimer}
        </AppText>
      </View>
    </View>
  )
}

function UserBubble({ text, time }: { text: string; time: string }) {
  return (
    <View style={{ alignSelf: "flex-end", maxWidth: "82%", gap: 4 }}>
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          borderBottomRightRadius: 6,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
        }}
      >
        <AppText variant="body" color={colors.onPrimary}>
          {text}
        </AppText>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          alignSelf: "flex-end",
          paddingHorizontal: 4,
        }}
      >
        <AppText variant="caption" color={colors.textFaint}>
          {time}
        </AppText>
        <Ionicons name="checkmark-done" size={13} color={colors.textFaint} />
      </View>
    </View>
  )
}

/**
 * One assistant turn: a small gold-sparkle avatar next to a cream bubble,
 * followed (when the AI recommended doctors) by a labelled doctor stack.
 * Grouping the reply with its recommendations avoids the previous look where
 * doctor cards floated loose beneath the chat.
 */
function AssistantMessage({
  text,
  time,
  doctors,
  doctorsLabel,
}: {
  text: string
  time: string
  doctors: AssistantDoctor[]
  doctorsLabel: string
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, maxWidth: "92%" }}>
      <AiDoctor size={32} style={{ marginBottom: 2 }} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View
          style={[
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderBottomLeftRadius: 6,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
            },
            shadows.card,
          ]}
        >
          <AppText variant="body">{text}</AppText>
        </View>
        <AppText
          variant="caption"
          color={colors.textFaint}
          style={{ alignSelf: "flex-start", paddingHorizontal: 4, marginTop: -6 }}
        >
          {time}
        </AppText>
        {doctors.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 }}
            >
              <Ionicons name="ribbon-outline" size={14} color={colors.gold} />
              <AppText variant="caption" weight="bold" color={colors.textMuted}>
                {doctorsLabel}
              </AppText>
            </View>
            <View style={{ gap: spacing.sm }}>
              {doctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}

/**
 * Three softly-pulsing dots so the wait between "sent" and "replied" reads as
 * a real conversation rather than a silent app-hang.
 */
function TypingIndicator({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
      <View
        style={{
          width: 32,
          height: 32,
        }}
      >
        <AiDoctor size={32} />
      </View>
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderBottomLeftRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
          },
          shadows.card,
        ]}
      >
        <TypingDot delay={0} />
        <TypingDot delay={160} />
        <TypingDot delay={320} />
        <AppText variant="caption" color={colors.textMuted} style={{ marginStart: 4 }}>
          {label}
        </AppText>
      </View>
    </View>
  )
}

function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3)
  useEffect(() => {
    opacity.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
            withTiming(0.3, { duration: 420, easing: Easing.in(Easing.cubic) }),
          ),
          -1,
          false,
        ),
      ),
    )
  }, [opacity, delay])
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }))
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
        style,
      ]}
    />
  )
}

function SuggestionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.primarySoft,
          backgroundColor: pressed ? colors.primarySoft : colors.card,
          paddingHorizontal: spacing.md,
          paddingVertical: 9,
        },
        shadows.card,
      ]}
    >
      <Ionicons name="sparkles" size={13} color={colors.gold} />
      <AppText variant="caption" weight="bold" color={colors.primary}>
        {label}
      </AppText>
    </Pressable>
  )
}

/**
 * A recommended doctor. Tap → open profile. The layout mirrors the doctor
 * cards elsewhere in the app so a card that appears in chat feels native to
 * the product, not an AI attachment.
 */
function DoctorCard({ doctor }: { doctor: AssistantDoctor }) {
  const { t, isRTL } = useI18n()
  const location = [doctor.title, doctor.city].filter(Boolean).join(" · ")
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        router.push(`/doctor/${doctor.slug}`)
      }}
      accessibilityRole="button"
      accessibilityLabel={`${t.assistant.viewDoctor}: ${doctor.name}`}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          opacity: pressed ? 0.94 : 1,
        },
        shadows.card,
      ]}
    >
      <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size={52} />
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="body" weight="bold" numberOfLines={1}>
          {doctor.name}
        </AppText>
        {location ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {location}
          </AppText>
        ) : null}
        {doctor.consultationFee ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="pricetag-outline" size={12} color={colors.primary} />
            <AppText variant="caption" weight="bold" color={colors.primary}>
              {doctor.consultationFee} {doctor.currency}
            </AppText>
          </View>
        ) : null}
      </View>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color={colors.primary} />
      </View>
    </Pressable>
  )
}
