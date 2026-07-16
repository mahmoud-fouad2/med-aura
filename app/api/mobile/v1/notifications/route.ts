import { z } from "zod"
import {
  getUnreadNotificationCount,
  listNotifications,
} from "@/lib/data/notifications"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notification-inbox"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** The signed-in user's inbox + unread count, one call for the whole screen. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const [rows, unread] = await Promise.all([
      listNotifications(auth.user.id, { limit: 50 }),
      getUnreadNotificationCount(auth.user.id),
    ])
    return jsonOk({
      unread,
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}

const MarkReadSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ all: z.literal(true) }),
])

/**
 * Mark one notification (`{id}`) or everything (`{all:true}`) as read.
 * Ownership is enforced inside the shared inbox actions — the same rules the
 * web dashboard runs.
 */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = MarkReadSchema.safeParse(body)
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)

  const result =
    "all" in parsed.data
      ? await markAllNotificationsRead()
      : await markNotificationRead(parsed.data.id)

  if (!result.ok) {
    return jsonError(result.error ?? "تعذّر إتمام العملية.", 400)
  }
  return jsonOk({ updated: true })
}
