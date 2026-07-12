import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import * as SecureStore from "expo-secure-store"
import { API_URL, APP_SCHEME } from "./config"

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
      storage: SecureStore,
    }),
  ],
})
