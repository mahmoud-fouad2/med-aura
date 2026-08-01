/**
 * The app talks to the same deployed backend as the web platform.
 * Override per environment with EXPO_PUBLIC_API_URL (e.g. LAN dev server).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://medauraworld.com"

export const APP_SCHEME = "medaura"

/**
 * Passed as `storagePrefix` to @better-auth/expo's expoClient(). Exported so
 * index.js can derive the exact keys to pre-warm (`${prefix}_cookie`,
 * `${prefix}_session_data`) before the auth client is ever imported, instead
 * of duplicating the prefix as a second hardcoded literal that could
 * silently drift from this one.
 */
export const AUTH_STORAGE_PREFIX = "medaura"
