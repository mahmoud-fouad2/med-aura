import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppText, Button } from "./ui"
import { BottomSheet } from "./bottom-sheet"
import { useI18n } from "../lib/i18n"
import { colors, radius, spacing } from "../theme"

/**
 * Explainer shown BEFORE the OS location prompt — never request permission
 * cold. Matches the app's own brand instead of a bare system dialog.
 */
export function LocationPermissionSheet({
  visible,
  busy,
  onClose,
  onContinue,
}: {
  visible: boolean
  busy: boolean
  onClose: () => void
  onContinue: () => void
}) {
  const { t } = useI18n()
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.filters.nearest}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.full,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="location" size={30} color={colors.primary} />
          </View>
          <AppText variant="body" color={colors.textMuted} style={{ textAlign: "center" }}>
            {t.filters.nearestExplain}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button label={t.common.cancel} variant="secondary" onPress={onClose} disabled={busy} />
          </View>
          <View style={{ flex: 1.4 }}>
            <Button
              label={t.filters.nearestContinue}
              onPress={onContinue}
              disabled={busy}
              loading={busy}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  )
}
