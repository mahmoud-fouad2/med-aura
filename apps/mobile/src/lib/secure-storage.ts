import * as SecureStore from "expo-secure-store"

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
 * `setItem` writes to the buffer synchronously (satisfying better-auth's
 * expectation that the next read sees the new value) and mirrors to the
 * native keychain best-effort in the background — a failed native write
 * costs at most one session survival across a hard restart, never a
 * crash.
 */

/** In-memory mirror of the persisted keys @better-auth/expo cares about. */
const buffer = new Map<string, string>()

/** Track keys we've seen so warmSecureStore can drop-and-clean anything corrupted. */
const seenKeys = new Set<string>()

export const safeSecureStore = {
  getItem(key: string): string | null {
    seenKeys.add(key)
    return buffer.get(key) ?? null
  },
  setItem(key: string, value: string): void {
    seenKeys.add(key)
    buffer.set(key, value)
    // Fire-and-forget: a keychain write failure never blocks or crashes
    // the caller. Worst case, this key is missing after a hard restart —
    // the user re-signs in, no crash loop.
    void SecureStore.setItemAsync(key, value).catch((error) => {
      console.warn(`[secure-store] setItemAsync("${key}") failed`, error)
    })
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
      try {
        const value = await SecureStore.getItemAsync(key)
        if (value != null) buffer.set(key, value)
      } catch (error) {
        console.warn(`[secure-store] warm("${key}") failed — dropping`, error)
        // Best-effort cleanup so the next launch doesn't hit the same bad
        // key. If the delete itself fails there's nothing more we can do.
        void SecureStore.deleteItemAsync(key).catch(() => undefined)
      }
    }),
  )
}
