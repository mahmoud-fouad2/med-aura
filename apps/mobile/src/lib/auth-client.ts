import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import { twoFactorClient } from "better-auth/client/plugins"
import { API_URL, APP_SCHEME, AUTH_STORAGE_PREFIX } from "./config"
import { safeSecureStore } from "./secure-storage"

/**
 * Talks to the platform's existing Better Auth endpoints. The Expo plugin
 * keeps the session in the device keychain/keystore (never plain storage)
 * and attaches it to auth requests automatically.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: AUTH_STORAGE_PREFIX,
      // MUST match the server's `advanced.cookiePrefix` (lib/auth.ts). The
      // plugin only persists Set-Cookie values whose name starts with this —
      // with the default ("better-auth") our `__Secure-medaura.session_token`
      // was silently dropped, so every API call went out unauthenticated and
      // the session never survived a restart.
      cookiePrefix: "medaura",
      // NEVER pass the raw SecureStore module here. @better-auth/expo reads
      // storage.getItem() *synchronously* right here, at client-creation
      // time — and expo-secure-store's sync getItem is a real native crash
      // vector (a Keystore key invalidated by a biometric/PIN change, OS
      // update, or corrupted entry can crash the whole app before any JS
      // try/catch runs, not just throw a catchable error). safeSecureStore
      // never calls the sync API at all — it's an in-memory buffer that
      // index.js populates via the async API (which safely rejects instead
      // of crashing) before this module is ever imported. See
      // secure-storage.ts and index.js.
      storage: safeSecureStore,
    }),
    // No onTwoFactorRedirect here — the sign-in screen reads
    // signIn.email()'s own response for twoFactorRedirect/twoFactorMethods
    // and swaps in the verification step directly, same as web.
    twoFactorClient(),
  ],
})
