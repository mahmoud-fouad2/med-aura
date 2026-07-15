import { Image } from "expo-image"
import { View, type StyleProp, type ViewStyle } from "react-native"

/**
 * Central place every screen gets brand art from — one import path means the
 * logo can never drift or be replaced by a stand-in icon again.
 *
 * `require` (not a URL) keeps every asset inside the bundle: no CDN, no
 * hotlink, works offline, and the app store review sees a self-contained app.
 */
export const brandAssets = {
  logo: require("../../assets/brand/logo-transparent.png"),
  logoWhite: require("../../assets/brand/logo-white.png"),
  splashBg: require("../../assets/backgrounds/splash.png"),
  authBg: require("../../assets/backgrounds/auth.png"),
  homeHero: require("../../assets/backgrounds/home-hero.png"),
} as const

export const onboardingArt = {
  trust: require("../../assets/onboarding/trust.png"),
  consult: require("../../assets/onboarding/consult.png"),
  journey: require("../../assets/onboarding/journey.png"),
  privacy: require("../../assets/onboarding/privacy.png"),
} as const

export const stateArt = {
  noAppointments: require("../../assets/states/no-appointments.png"),
  noFiles: require("../../assets/states/no-files.png"),
  noNotifications: require("../../assets/states/no-notifications.png"),
  noInvoices: require("../../assets/states/no-invoices.png"),
  bookingSuccess: require("../../assets/states/booking-success.png"),
  offline: require("../../assets/states/offline.png"),
} as const

/**
 * The wordmark. `contain` + an explicit height keeps the logo's aspect ratio
 * intact on every screen size — it can never stretch or squash.
 */
export function Logo({
  height = 44,
  variant = "ink",
  style,
}: {
  height?: number
  /** "white" for the purple splash/hero; "ink" for light surfaces. */
  variant?: "ink" | "white"
  style?: StyleProp<ViewStyle>
}) {
  // Source aspect ratio of the trimmed logo (~2.06:1) — width follows height
  // so the mark scales without distortion.
  const width = height * 2.06
  return (
    <View style={style}>
      <Image
        source={variant === "white" ? brandAssets.logoWhite : brandAssets.logo}
        style={{ width, height }}
        contentFit="contain"
        transition={200}
        accessibilityLabel="Med Aura"
      />
    </View>
  )
}
