import { auth } from "@/lib/auth"
import { canAccessCase } from "@/lib/rbac"
import { getPusherServer } from "@/lib/pusher"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const PRIVATE_CASE_CHANNEL = /^private-case-([A-Za-z0-9_-]{1,160})$/

export function caseIdFromPrivateChannel(channelName: string): string | null {
  return PRIVATE_CASE_CHANNEL.exec(channelName)?.[1] ?? null
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const socketId = form?.get("socket_id")
  const channelName = form?.get("channel_name")
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return Response.json({ error: "Invalid channel request" }, { status: 400 })
  }

  const caseId = caseIdFromPrivateChannel(channelName)
  if (!caseId || !(await canAccessCase(session.user.id, caseId))) {
    logger.warn("Pusher channel authorization denied", {
      userId: session.user.id,
      channelType: caseId ? "case" : "invalid",
    })
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const pusher = getPusherServer()
  if (!pusher) return Response.json({ error: "Real-time service unavailable" }, { status: 503 })

  return Response.json(pusher.authorizeChannel(socketId, channelName))
}
