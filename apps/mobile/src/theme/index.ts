/**
 * Med Aura native design tokens — mirrors the brand system of the platform
 * (deep calm purple, soft lavender, warm cream, restrained gold accent).
 * Every screen consumes these; no ad-hoc colors/spacing in components.
 */
export const colors = {
  primary: "#4A1D96",
  primarySoft: "#F3EEFC",
  primaryMuted: "#7C5CC4",
  ink: "#1A1740",
  gold: "#C9A24B",
  goldSoft: "#F7EFDC",

  background: "#FFFCF7",
  card: "#FFFFFF",
  border: "#EAE6F2",
  overlay: "rgba(26, 23, 64, 0.45)",

  text: "#241F49",
  textMuted: "#6B6884",
  textFaint: "#9B97B0",

  success: "#1E8E5A",
  successSoft: "#E5F5EC",
  warning: "#B7791F",
  warningSoft: "#FBF1DE",
  danger: "#C93B3B",
  dangerSoft: "#FBE9E9",
  info: "#2F6FBF",
  infoSoft: "#E8F0FB",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 20,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const

export const type = {
  hero: 28,
  title: 22,
  heading: 18,
  body: 15,
  sub: 13,
  caption: 11,
} as const

/** Soft purple-tinted elevation matching the web's "elegant" shadows. */
export const shadows = {
  card: {
    shadowColor: "#31206B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  raised: {
    shadowColor: "#31206B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
} as const

export const motion = {
  fast: 160,
  base: 240,
  slow: 380,
} as const
