import { db } from "./db"
import { notification, notificationDelivery } from "./db/schema"
import { isEmailConfigured } from "./env"
import { sendEmail } from "./email"
import { logger } from "./logger"

export type NotifyInput = {
  userId: string
  type: string
  title: string
  body?: string
  caseId?: string
  href?: string
  /** Optional email mirror; logged as NOT_CONFIGURED when no provider is set. */
  email?: { to: string; subject: string; html: string }
}

/**
 * Create an in-app notification (+ delivery records). Best-effort: never throws,
 * so a notification failure can't break the underlying business action. In-app
 * is the guaranteed channel; email is recorded honestly (SENT/FAILED/NOT_CONFIGURED).
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const rows = await db
      .insert(notification)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        caseId: input.caseId,
        href: input.href,
      })
      .returning({ id: notification.id })
    const nid = rows[0].id

    await db.insert(notificationDelivery).values({
      notificationId: nid,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),
    })

    if (input.email) {
      if (isEmailConfigured()) {
        const res = await sendEmail(input.email)
        await db.insert(notificationDelivery).values({
          notificationId: nid,
          channel: "EMAIL",
          status: res.delivered ? "SENT" : "FAILED",
          sentAt: res.delivered ? new Date() : null,
        })
      } else {
        await db.insert(notificationDelivery).values({
          notificationId: nid,
          channel: "EMAIL",
          status: "NOT_CONFIGURED",
        })
      }
    }
  } catch (err) {
    logger.error("notify failed", {
      type: input.type,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
