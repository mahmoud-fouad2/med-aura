import { View, type StyleProp, type ViewStyle } from "react-native"
import { Image } from "expo-image"

/**
 * "مستشار Med Aura" — the AI concierge's face. A friendly doctor portrait
 * that reads instantly as a person to talk to, rather than a generic AI
 * sparkle.
 *
 * The source art is already a self-contained circular avatar (purple disc,
 * white coat, stethoscope, chat bubble), so this renders it directly with no
 * outer ring or tinted backing — wrapping it in another circle just
 * double-frames the same shape.
 */
const AVATAR = require("../../assets/brand/ai-doctor.png")

export function AiDoctor({
  size = 64,
  style,
}: {
  size?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={AVATAR}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={160}
        accessibilityLabel="مستشار Med Aura"
      />
    </View>
  )
}
