import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native"
import { router } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button, Card, ChevronBack } from "../../components/ui"
import { api, type TicketCategory } from "../../lib/api"
import { useI18n } from "../../lib/i18n"
import { colors, radius, spacing } from "../../theme"
import { Field, inputStyle } from "../sign-in"

const CATEGORIES: TicketCategory[] = ["ACCOUNT", "BOOKING", "BILLING", "MEDICAL", "TECHNICAL", "OTHER"]

/** Opens a new standalone support ticket — same createSupportTicket action
 *  (validation, audit, staff notification) the web dashboard's
 *  /dashboard/support/new form calls. */
export default function NewTicket() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<TicketCategory>("OTHER")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => api.createTicket({ subject: subject.trim(), category, body: body.trim() }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] })
      router.replace(`/support/${data.ticketId}`)
    },
    onError: () => setError(t.tickets.createError),
  })

  const canSend = subject.trim().length >= 3 && body.trim().length >= 5 && !create.isPending

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
        <AppText variant="title" weight="heavy">
          {t.tickets.newTicket}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.primarySoft,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.md,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="body" weight="bold" color={colors.primary}>
                {t.tickets.newTicket}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {t.tickets.emptyBody}
              </AppText>
            </View>
          </View>

          <Field label={t.tickets.subject}>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder={t.tickets.subjectPlaceholder}
              placeholderTextColor={colors.textFaint}
              style={inputStyle}
              maxLength={200}
            />
          </Field>

          <Field label={t.tickets.category}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {CATEGORIES.map((c) => (
                <CategoryChip
                  key={c}
                  label={t.ticketCategory[c]}
                  active={category === c}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    setCategory(c)
                  }}
                />
              ))}
            </View>
          </Field>

          <Field label={t.tickets.body}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t.tickets.bodyPlaceholder}
              placeholderTextColor={colors.textFaint}
              style={[inputStyle, { minHeight: 120, textAlignVertical: "top" }]}
              multiline
              maxLength={5000}
            />
          </Field>

          {error ? (
            <AppText variant="sub" color={colors.danger}>
              {error}
            </AppText>
          ) : null}

          <Button
            label={t.tickets.send}
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!canSend}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.card,
      }}
    >
      <AppText
        variant="caption"
        weight={active ? "bold" : "medium"}
        color={active ? colors.primary : colors.textMuted}
      >
        {label}
      </AppText>
    </Pressable>
  )
}
