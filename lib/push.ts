import { Expo, type ExpoPushMessage } from "expo-server-sdk"
import { eq, inArray } from "drizzle-orm"
import { db } from "./db"
import { pushToken } from "./db/schema"
import { logger } from "./logger"

const expo = new Expo()

/**
 * Fan out one notification to every device on file for a user. Best-effort,
 * like `notify()` itself: a push failure never breaks the underlying
 * business action. A token Expo reports as DeviceNotRegistered is deleted
 * immediately rather than retried — it means the app was uninstalled or the
 * OS revoked it.
 */
export async function sendPushToUser(
  userId: string,
  input: { title: string; body?: string; data?: Record<string, unknown> },
): Promise<void> {
  try {
    const tokens = await db
      .select({ id: pushToken.id, token: pushToken.token })
      .from(pushToken)
      .where(eq(pushToken.userId, userId))
    if (tokens.length === 0) return

    const messages: ExpoPushMessage[] = []
    for (const { token } of tokens) {
      if (!Expo.isExpoPushToken(token)) continue
      messages.push({
        to: token,
        title: input.title,
        body: input.body,
        data: input.data,
        sound: "default",
      })
    }
    if (messages.length === 0) return

    const chunks = expo.chunkPushNotifications(messages)
    const staleTokens: string[] = []
    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk)
      receipts.forEach((receipt, i) => {
        if (
          receipt.status === "error" &&
          receipt.details?.error === "DeviceNotRegistered"
        ) {
          staleTokens.push(chunk[i].to as string)
        }
      })
    }
    if (staleTokens.length > 0) {
      await db.delete(pushToken).where(inArray(pushToken.token, staleTokens))
    }
  } catch (err) {
    logger.error("sendPushToUser failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
