import { Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors } from "../theme"

export function VideoControl({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: danger
          ? colors.danger
          : active
            ? colors.videoControlActive
            : colors.videoControlIdle,
        transform: [
          { scale: pressed ? 0.93 : 1 },
          { rotate: danger ? "135deg" : "0deg" },
        ],
      })}
    >
      <Ionicons name={icon} size={22} color={colors.onPrimary} />
    </Pressable>
  )
}
