import { View, type TextStyle } from "react-native"
import { AppText } from "./ui"
import { colors, radius, spacing } from "../theme"

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="sub" weight="medium">
        {label}
      </AppText>
      {hint ? (
        <AppText variant="caption" color={colors.textFaint}>
          {hint}
        </AppText>
      ) : null}
      {children}
    </View>
  )
}

export function FormError({ message }: { message: string }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.dangerSoft,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <AppText variant="sub" color={colors.danger}>
        {message}
      </AppText>
    </View>
  )
}

export const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: colors.text,
  backgroundColor: colors.card,
} satisfies TextStyle
