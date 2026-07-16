import * as SecureStore from "expo-secure-store"
import * as LocalAuthentication from "expo-local-authentication"

/**
 * Biometric app lock. The preference lives in the keychain/keystore next to
 * the session; a module-level mirror lets the lock gate react to changes made
 * from the settings screen within the same run (no restart needed).
 */

const APP_LOCK_KEY = "medaura.applock"

let cachedEnabled = false

/** Synchronous view of the preference for event handlers (AppState). */
export function appLockEnabledSync(): boolean {
  return cachedEnabled
}

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    cachedEnabled = (await SecureStore.getItemAsync(APP_LOCK_KEY)) === "1"
  } catch {
    cachedEnabled = false
  }
  return cachedEnabled
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled
  await SecureStore.setItemAsync(APP_LOCK_KEY, enabled ? "1" : "0")
}

export type BiometricAvailability = "ready" | "no-hardware" | "not-enrolled"

export async function biometricAvailability(): Promise<BiometricAvailability> {
  if (!(await LocalAuthentication.hasHardwareAsync())) return "no-hardware"
  if (!(await LocalAuthentication.isEnrolledAsync())) return "not-enrolled"
  return "ready"
}

/** True when the user proved their identity. */
export async function authenticate(
  promptMessage: string,
  cancelLabel: string,
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      // The device PIN/pattern stays available as a fallback — an unreadable
      // finger must never lock someone out of their own appointments.
      disableDeviceFallback: false,
    })
    return result.success
  } catch {
    return false
  }
}
