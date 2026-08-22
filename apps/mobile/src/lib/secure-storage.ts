import * as SecureStore from "expo-secure-store"
import { browserStorage } from "./platform-storage"

/**
 * @better-auth/expo requires a *synchronous* storage interface — it calls
 * `storage.getItem` during client construction (module-evaluation time,
 * before any React component or error boundary exists), and the return
 * value is read immediately. That rules out passing async storage
 * directly.
 *
 * The obvious wrapper — try/catch around `SecureStore.getItem` (the sync
 * native call) — turned out not to be enough on real devices. When
 * Android's keystore is invalidated (biometric/PIN change, OS update,
 * corrupted entry, etc.), the sync native call can crash the whole app
 * before the JS `catch` ever runs. That's the crash-on-reopen loop the
 * user was seeing: install → sign in → close → reopen → the sync
 * keystore read dies natively → the app closes → uninstall+reinstall
 * clears the keystore entry → the cycle repeats.
 *
 * This new design never touches the sync native API. Instead it keeps an
 * in-memory buffer that satisfies the synchronous contract, and populates
 * that buffer via `getItemAsync` — which returns a rejected promise
 * instead of natively crashing when a key can't be read. `warmSecureStore`
 * is called once at boot before the app reads anything session-derived,
 * so by the time `authClient.getSession()` fires, the buffer is
 * authoritative. A bad key is dropped and cleaned up, never crashed on.
 *
 * `setItem` writes to the buffer synchronously, then returns the async native
 * write. Better Auth awaits that promise while persisting chunked values, so
 * its final chunk marker can never overtake an unfinished chunk write.
 */

/** In-memory mirror of the persisted keys @better-auth/expo cares about. */
const buffer = new Map<string, string>()

/** Track keys we've seen so warmSecureStore can drop-and-clean anything corrupted. */
const seenKeys = new Set<string>()
const CHUNK_MARKER = "\u0001ba-chunks:"
const MAX_CHUNKS = 64

export const safeSecureStore = {
  getItem(key: string): string | null {
    seenKeys.add(key)
    return buffer.get(key) ?? browserStorage()?.getItem(key) ?? null
  },
  setItem(key: string, value: string): Promise<void> {
    seenKeys.add(key)
    buffer.set(key, value)
    const storage = browserStorage()
    if (storage) {
      try {
        storage.setItem(key, value)
        return Promise.resolve()
      } catch (error) {
        return Promise.reject(error)
      }
    }
    return SecureStore.setItemAsync(key, value)
  },
}

/**
 * Read the given keys from the native keychain into the sync buffer.
 * Any key that fails to read (invalidated, corrupted, unreadable for any
 * reason) is dropped and the buffer entry stays empty — the caller sees
 * the same "nothing stored" state as a fresh install, no crash.
 *
 * Call this ONCE at app boot before anything session-dependent renders.
 * Safe to await; it never throws.
 */
export async function warmSecureStore(keys: readonly string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      seenKeys.add(key)
      let chunkCount = 0
      try {
        const storage = browserStorage()
        const value = storage ? storage.getItem(key) : await SecureStore.getItemAsync(key)
        if (value == null) return
        buffer.set(key, value)

        if (!value.startsWith(CHUNK_MARKER)) return
        chunkCount = Number(value.slice(CHUNK_MARKER.length))
        if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_CHUNKS) {
          throw new Error("Invalid Better Auth chunk marker")
        }

        for (let index = 0; index < chunkCount; index++) {
          const chunkKey = `${key}.${index}`
          seenKeys.add(chunkKey)
          const chunk = storage
            ? storage.getItem(chunkKey)
            : await SecureStore.getItemAsync(chunkKey)
          if (chunk == null) throw new Error("Incomplete Better Auth chunked value")
          buffer.set(chunkKey, chunk)
        }
      } catch (error) {
        console.warn(`[secure-store] warm("${key}") failed — dropping`, error)
        buffer.delete(key)
        // Best-effort cleanup so the next launch doesn't hit the same bad
        // key. If the delete itself fails there's nothing more we can do.
        const storage = browserStorage()
        const cleanupKeys = [
          key,
          ...Array.from({ length: chunkCount }, (_, index) => `${key}.${index}`),
        ]
        for (const cleanupKey of cleanupKeys) {
          buffer.delete(cleanupKey)
          if (storage) storage.removeItem(cleanupKey)
          else await SecureStore.deleteItemAsync(cleanupKey).catch(() => undefined)
        }
      }
    }),
  )
}
