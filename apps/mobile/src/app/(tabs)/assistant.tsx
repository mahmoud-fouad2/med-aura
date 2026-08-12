import { useCallback, useRef, useState } from "react"
import {
  ActivityIndicator,
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
import { AppText, Avatar, IconBadge } from "../../components/ui"
import { api, NetworkError, type AssistantDoctor, type AssistantTurn } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, shadows, spacing, TAB_BAR_HEIGHT } from "../../theme"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  doctors?: AssistantDoctor[]
  followups?: string[]
}

let idCounter = 0
const nextId = () => `m${++idCounter}`

export default function Assistant() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return
      void Haptics.selectionAsync()
      const userMsg: ChatMessage = { id: nextId(), role: "user", content: trimmed }
      const history = [...messages, userMsg]
      setMessages(history)
      setInput("")
      setSending(true)
      scrollToEnd()
      try {
        const turns: AssistantTurn[] = history.map((m) => ({ role: m.role, content: m.content }))
        const res = await api.assistant(turns)
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: res.reply || t.assistant.error,
            doctors: res.doctors,
            followups: res.followups,
          },
        ])
      } catch (err) {
        const msg = err instanceof NetworkError ? t.common.offline : t.assistant.error
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: msg }])
      } finally {
        setSending(false)
        scrollToEnd()
      }
    },
    [messages, sending, scrollToEnd, t],
  )

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
  const activeFollowups = !sending ? (lastAssistant?.followups ?? []) : []

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.screen,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: colors.gold,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles" size={22} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="heavy">
            {t.assistant.title}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t.assistant.subtitle}
          </AppText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: spacing.lg,
          gap: spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {/* Greeting + disclaimer on an empty conversation. */}
        {messages.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            <AssistantBubble text={t.assistant.greeting} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                backgroundColor: colors.goldSoft,
                borderRadius: radius.md,
                padding: spacing.md,
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
              <AppText variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
                {t.assistant.disclaimer}
              </AppText>
            </View>
          </View>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <UserBubble key={m.id} text={m.content} />
          ) : (
            <View key={m.id} style={{ gap: spacing.sm }}>
              <AssistantBubble text={m.content} />
              {(m.doctors ?? []).length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <AppText variant="caption" weight="bold" color={colors.textMuted}>
                    {t.assistant.recommendedDoctors}
                  </AppText>
                  {m.doctors!.map((d) => (
                    <DoctorCard key={d.id} doctor={d} />
                  ))}
                </View>
              ) : null}
            </View>
          ),
        )}

        {sending ? (
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" color={colors.textMuted}>
              {t.assistant.thinking}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      {/* Starter / follow-up chips */}
      {(messages.length === 0 || activeFollowups.length > 0) && !sending ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.sm, paddingBottom: spacing.sm }}
        >
          {(messages.length === 0 ? t.assistant.starters : activeFollowups).map((chip, i) => (
            <Pressable
              key={`${chip}-${i}`}
              onPress={() => void send(chip)}
              style={{
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
              }}
            >
              <AppText variant="caption" weight="medium" color={colors.primary}>
                {chip}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Input bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: spacing.sm,
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
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
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 15,
            color: colors.text,
            backgroundColor: colors.background,
            writingDirection: "auto",
          }}
        />
        <Pressable
          onPress={() => void send(input)}
          disabled={!input.trim() || sending}
          accessibilityRole="button"
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: input.trim() && !sending ? colors.primary : colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-end",
        maxWidth: "85%",
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        borderBottomRightRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <AppText variant="body" color="#FFFFFF">
        {text}
      </AppText>
    </View>
  )
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          maxWidth: "88%",
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderBottomLeftRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        shadows.card,
      ]}
    >
      <AppText variant="body">{text}</AppText>
    </View>
  )
}

function DoctorCard({ doctor }: { doctor: AssistantDoctor }) {
  const location = [doctor.title, doctor.city].filter(Boolean).join(" · ")
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        router.push(`/doctor/${doctor.slug}`)
      }}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
        },
        shadows.card,
      ]}
    >
      <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="bold" numberOfLines={1}>
          {doctor.name}
        </AppText>
        {location ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {location}
          </AppText>
        ) : null}
        {doctor.consultationFee ? (
          <AppText variant="caption" weight="medium" color={colors.primary}>
            {doctor.consultationFee} {doctor.currency}
          </AppText>
        ) : null}
      </View>
      <IconBadge icon="calendar-outline" size={36} />
    </Pressable>
  )
}
