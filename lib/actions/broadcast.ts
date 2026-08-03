"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { user, notificationPreference } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

export const BROADCAST_AUDIENCES = ["all", "patients", "doctors"] as const
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number]

const broadcastSchema = z.object({
  title: z.string().trim().min(3, "اكتب عنوانًا للإشعار").max(120),
  body: z.string().trim().min(3, "اكتب نص الرسالة").max(500),
  audience: z.enum(BROADCAST_AUDIENCES),
})

/**
 * Sends an in-app + push notification to every account in the chosen
 * audience that has actually opted in to offers/marketing (offersEnabled —
 * default false, opt-in, matching the mobile Profile toggle this reuses).
 * Super-admin only — see NOTIFICATIONS_BROADCAST in lib/rbac.ts — given the
 * blast radius of "every member" has no equivalent anywhere else in this
 * app. Reuses notify() per recipient, the same insert+push path every
 * other notification goes through (delivery bookkeeping, stale-token
 * cleanup), rather than a second, parallel send path.
 *
 * Reach note: since this is opt-in, a user who has never touched the
 * "News & offers" toggle is excluded (no notificationPreference row = not
 * opted in) — this can mean low initial reach until users opt in. That's a
 * deliberate consent choice (preserving the toggle's existing default),
 * not a bug; switching to opt-out is a one-line default-value change if a
 * product owner decides differently.
 */
export async function sendBroadcastAction(
  input: unknown,
): Promise<ActionResult<{ recipientCount: number }>> {
  try {
    const actor = await requireUser()
    await requirePermission(actor.id, PERMISSIONS.NOTIFICATIONS_BROADCAST)

    const parsed = broadcastSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const { title, body, audience } = parsed.data

    const roleCondition =
      audience === "patients"
        ? eq(user.role, "patient")
        : audience === "doctors"
          ? eq(user.role, "doctor")
          : undefined

    const recipients = await db
      .select({ id: user.id })
      .from(user)
      .innerJoin(
        notificationPreference,
        and(eq(notificationPreference.userId, user.id), eq(notificationPreference.offersEnabled, true)),
      )
      .where(roleCondition)

    for (const r of recipients) {
      await notify({
        userId: r.id,
        type: "broadcast.announcement",
        title,
        body,
        href: "/dashboard/notifications",
      })
    }

    const meta = await requestMeta()
    await writeAudit({
      action: "notifications.broadcast.send",
      actorUserId: actor.id,
      entityType: "broadcast",
      entityId: crypto.randomUUID(),
      metadata: { title, audience, recipientCount: recipients.length },
      ...meta,
    })

    return { ok: true, data: { recipientCount: recipients.length } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
