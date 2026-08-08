import { z } from "zod"
import { getTicketDetail } from "@/lib/data/support-tickets"
import { markTicketRead, replyToTicket } from "@/lib/actions/support-tickets"
import { jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * A single ticket's full thread. Mobile is patient/doctor self-service only
 * — viewerCanManage is always false, matching the web dashboard's
 * /dashboard/support/[id] page (staff triage stays on /admin/tickets,
 * web-only). Viewing marks the thread read, same as the web thread does on
 * mount.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const detail = await getTicketDetail(id, auth.user.id, false)
    if (!detail) return jsonError("التذكرة غير موجودة.", 404)
    await markTicketRead(id)
    return jsonOk({
      id: detail.id,
      subject: detail.subject,
      status: detail.status,
      category: detail.category,
      createdAt: detail.createdAt.toISOString(),
      messages: detail.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        mine: m.senderUserId === auth.user.id,
      })),
    })
  } catch (err) {
    return jsonServerError("mobile.tickets.id", err)
  }
}

const ReplySchema = z.object({ body: z.string().min(1).max(5000) })

/** Reply as the ticket's requester. Server-side status/participant rules
 *  (auto-reopen etc.) are identical to the web thread — replyToTicket is
 *  the same action either surface calls. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const { id } = await params
  const parsed = ReplySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("اكتب ردًّا قبل الإرسال.", 400)
  const result = await replyToTicket({ ticketId: id, body: parsed.data.body })
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : result.code === "FORBIDDEN" ? 403 : 400
    return jsonError(result.error, status)
  }
  return jsonOk({ replied: true })
}
