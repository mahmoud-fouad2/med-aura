import { useState } from "react"
import { View } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius } from "../theme"

/**
 * The same category illustration the web uses for a service — never a
 * per-service photo (none exist in the catalog). Falls back to a plain brand
 * icon (never a broken-image/lock glyph) if the network image fails.
 */
export function ServiceThumbnail({
  uri,
  size,
  radiusSize = radius.lg,
  backgroundColor = colors.primarySoft,
  iconColor = colors.primary,
}: {
  uri: string
  size: number
  radiusSize?: number
  backgroundColor?: string
  iconColor?: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radiusSize,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {failed ? (
        <Ionicons name="sparkles-outline" size={size * 0.42} color={iconColor} />
      ) : (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  )
}
