/**
 * The app talks to the same deployed backend as the web platform.
 * Override per environment with EXPO_PUBLIC_API_URL (e.g. LAN dev server).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://med-aura.onrender.com"

export const APP_SCHEME = "medaura"
