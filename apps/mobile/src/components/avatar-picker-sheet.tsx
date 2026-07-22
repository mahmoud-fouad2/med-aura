import { useState } from "react"
import { ActivityIndicator, Linking, Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppText } from "./ui"
import { BottomSheet } from "./bottom-sheet"
import { pickFromLibrary, takePhoto, uploadAvatar, removeAvatar } from "../lib/avatar-upload"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

type Notice =
  | { kind: "denied"; canAskAgain: boolean }
  | { kind: "error"; message: string }
  | null

/**
 * The one place a patient or doctor changes their own photo — gallery,
 * camera, or remove. Reuses the same stable BottomSheet every other
 * confirm/pick flow uses, so it inherits the same reliable open/close.
 */
export function AvatarPickerSheet({
  visible,
  onClose,
  hasPhoto,
  onUploaded,
  onRemoved,
}: {
  visible: boolean
  onClose: () => void
  hasPhoto: boolean
  onUploaded: (photoUrl: string | null) => void
  onRemoved: () => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  async function afterPick(
    result: Awaited<ReturnType<typeof pickFromLibrary>>,
  ) {
    if (result.status === "canceled") return
    if (result.status === "denied") {
      setNotice({ kind: "denied", canAskAgain: result.canAskAgain })
      return
    }
    if (result.status === "error") {
      setNotice({ kind: "error", message: t.profile.photoPickError })
      return
    }
    setNotice(null)
    setBusy(true)
    const uploaded = await uploadAvatar(result.image)
    setBusy(false)
    if (!uploaded.ok) {
      setNotice({ kind: "error", message: uploaded.error })
      return
    }
    onUploaded(uploaded.photoUrl)
    onClose()
  }

  async function onLibrary() {
    if (busy) return
    await afterPick(await pickFromLibrary())
  }

  async function onCamera() {
    if (busy) return
    await afterPick(await takePhoto())
  }

  async function onRemove() {
    if (busy) return
    setNotice(null)
    setBusy(true)
    const result = await removeAvatar()
    setBusy(false)
    if (!result.ok) {
      setNotice({ kind: "error", message: result.error })
      return
    }
    onRemoved()
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.profile.editPhoto}>
      <View style={{ gap: spacing.sm }}>
        <PickerRow
          icon="images-outline"
          label={t.profile.chooseFromLibrary}
          onPress={() => void onLibrary()}
          disabled={busy}
        />
        <PickerRow
          icon="camera-outline"
          label={t.profile.takePhoto}
          onPress={() => void onCamera()}
          disabled={busy}
        />
        {hasPhoto ? (
          <PickerRow
            icon="trash-outline"
            label={t.profile.removePhoto}
            onPress={() => void onRemove()}
            disabled={busy}
            destructive
          />
        ) : null}

        {busy ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              paddingVertical: spacing.sm,
            }}
          >
            <ActivityIndicator color={colors.primary} />
            <AppText variant="caption" color={colors.textMuted}>
              {t.profile.photoUploading}
            </AppText>
          </View>
        ) : null}

        {notice ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            <AppText variant="caption" color={colors.textFaint}>
              {notice.kind === "error" ? notice.message : t.profile.photoPermissionDenied}
            </AppText>
            {notice.kind === "denied" && !notice.canAskAgain ? (
              <Pressable onPress={() => void Linking.openSettings()} hitSlop={4}>
                <AppText variant="caption" weight="bold" color={colors.primary}>
                  {t.filters.openSettings}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </BottomSheet>
  )
}

function PickerRow({
  icon,
  label,
  onPress,
  disabled,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.primarySoft : colors.card,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? colors.danger : colors.primary}
      />
      <AppText variant="body" color={destructive ? colors.danger : colors.text}>
        {label}
      </AppText>
    </Pressable>
  )
}
