import { warmSecureStore } from "./secure-storage"
import { AUTH_STORAGE_PREFIX } from "./config"

/**
 * The exact keys @better-auth/expo persists (see auth-client.ts): the session
 * cookie and the cached session payload. Derived from the one prefix so they
 * can never drift from the client's own naming.
 */
const KEYS = [`${AUTH_STORAGE_PREFIX}_cookie`, `${AUTH_STORAGE_PREFIX}_session_data`]

/**
 * Kicks off the keychain → in-memory buffer warm-up the moment this module is
 * imported (index.ts imports it first thing at launch), and exposes the
 * promise so the boot gate can *await* it before calling
 * `authClient.getSession()`.
 *
 * Why awaiting matters: the expo plugin's fetch hook reads the cookie from
 * storage *synchronously on every request* (`storage.getItem(cookieName)`).
 * If getSession() fires before the async keychain read has populated the
 * buffer, the request goes out with an empty cookie and the session looks
 * gone — the app drops to sign-in even though a valid session is on disk.
 * Awaiting this first closes that race. It never blocks native root
 * registration (that stays synchronous in index.ts) and never throws.
 */
export const secureStoreWarmed: Promise<void> = warmSecureStore(KEYS).catch(
  () => undefined,
)
