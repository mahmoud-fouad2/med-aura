import * as SecureStore from "expo-secure-store"

/**
 * @better-auth/expo calls `storage.getItem` synchronously while building the
 * auth client — at module-evaluation time, before any component (and so
 * before any error boundary) exists. `expo-secure-store`'s sync `getItem`
 * makes a blocking native Keystore/Keychain read that can throw for reasons
 * outside app control (a key invalidated by a biometric/PIN change, a
 * corrupted keystore entry, an OS update) — and the library never catches
 * that read. Left unguarded, a stored-but-now-unreadable session silently
 * kills the whole app on launch instead of just failing to restore one
 * cached value.
 *
 * This wraps the two calls @better-auth/expo actually makes (`getItem`,
 * `setItem` — see its `ExpoClientOptions.storage` type) so a broken read or
 * write degrades to "nothing was stored" instead of crashing. A doomed
 * getItem call means the user sees the sign-in screen again next launch —
 * annoying, never a silent close.
 */
export const safeSecureStore = {
  getItem(key: string): string | null {
    try {
      return SecureStore.getItem(key)
    } catch (error) {
      console.error(`[secure-store] getItem("${key}") failed`, error)
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      SecureStore.setItem(key, value)
    } catch (error) {
      console.error(`[secure-store] setItem("${key}") failed`, error)
    }
  },
}
