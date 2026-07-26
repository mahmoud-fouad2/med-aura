import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import { API_URL, APP_SCHEME } from "./config"
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
      storagePrefix: "medaura",
      // MUST match the server's `advanced.cookiePrefix` (lib/auth.ts). The
      // plugin only persists Set-Cookie values whose name starts with this —
      // with the default ("better-auth") our `__Secure-medaura.session_token`
      // was silently dropped, so every API call went out unauthenticated and
      // the session never survived a restart.
      cookiePrefix: "medaura",
      // NEVER pass the raw SecureStore module here — @better-auth/expo reads
      // it synchronously at client-creation time (module load, before any
      // error boundary exists), and an unguarded native Keystore/Keychain
      // read can throw and take the whole app down. See secure-storage.ts.
      storage: safeSecureStore,
    }),
  ],
})
