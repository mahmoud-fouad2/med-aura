import { z } from "zod"
import { listMyTickets, TICKET_CATEGORIES } from "@/lib/data/support-tickets"
import { createSupportTicket } from "@/lib/actions/support-tickets"
import { jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** The signed-in user's own support tickets — self-service only, same as
 *  the web dashboard's /dashboard/support (staff triage stays on
 *  /admin/tickets, web-only). */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const rows = await listMyTickets(auth.user.id)
    return jsonOk({
      tickets: rows.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        category: t.category,
        lastMessageAt: t.lastMessageAt.toISOString(),
        unreadForMe: t.unreadForMe,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    return jsonServerError("mobile.tickets", err)
  }
}

const CreateSchema = z.object({
  subject: z.string().min(3).max(200),
  category: z.enum(TICKET_CATEGORIES).optional(),
  body: z.string().min(5).max(5000),
})

/** Opens a new ticket. Delegates to the same action the web dashboard uses
 *  (validation + audit + staff notification). */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("تحقق من بيانات التذكرة.", 400)
  const result = await createSupportTicket(parsed.data)
  if (!result.ok) return jsonError(result.error, 400)
  return jsonOk(result.data)
}
