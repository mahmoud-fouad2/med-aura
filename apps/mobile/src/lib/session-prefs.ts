import * as SecureStore from "expo-secure-store"

/**
 * "Remember me" preference. The session cookie itself always lives in the
 * secure keychain/keystore (never plain storage) — this flag only decides
 * whether the boot gate restores it on a fresh cold start, or requires a new
 * sign-in. Default ON, per the product's preference for a low-friction return.
 */
const REMEMBER_KEY = "medaura.rememberme"

export async function isRememberMe(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(REMEMBER_KEY)
    // Unset → treated as ON (first run defaults to remembering).
    return v !== "0"
  } catch {
    return true
  }
}

export async function setRememberMe(remember: boolean): Promise<void> {
  await SecureStore.setItemAsync(REMEMBER_KEY, remember ? "1" : "0")
}
