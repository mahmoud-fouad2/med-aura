import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import Constants from "expo-constants"
import { api } from "./api"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function currentToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined
  // Push tokens are routed through Expo's own project id — one this app
  // hasn't been linked to yet (no `eas init`). Skipping silently here is the
  // only honest option: there's no token to get.
  if (!projectId) return null
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
  return data
}

/**
 * Best-effort device registration: requests the OS permission (if not yet
 * decided), then upserts the Expo push token for the signed-in user. Every
 * failure path — permission denied, no EAS project linked, network error —
 * silently no-ops. Registration must never block sign-in or app boot.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }
    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== "granted" && existing.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status
    }
    if (status !== "granted") return

    const token = await currentToken()
    if (!token) return
    await api.registerPushToken({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    })
  } catch {
    // Best-effort — see doc comment above.
  }
}

/** Called on sign-out so a shared/reset device stops getting this account's
 *  pushes once someone else signs in on it. */
export async function unregisterThisDevice(): Promise<void> {
  try {
    const token = await currentToken()
    if (!token) return
    await api.unregisterPushToken(token)
  } catch {
    // Best-effort — sign-out must never hang on this.
  }
}
