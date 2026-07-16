import type { NextRequest } from "next/server"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"
import {
  authorizeVideoJoin,
  ensureVideoSession,
  issueVideoToken,
} from "@/lib/video/service"

export const dynamic = "force-dynamic"

/**
 * Mint a short-lived join token for the authorized participant. Tokens are
 * never persisted and expire when the join window closes — there is no such
 * thing as a long-lived video credential in this system.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const gate = await authorizeVideoJoin(id, auth.user)
    if (!gate.ok) return jsonError(gate.message, gate.status)

    const session = await ensureVideoSession({
      appointmentId: gate.ctx.id,
      scheduledStartAt: gate.ctx.startsAt,
      scheduledEndAt: gate.ctx.endsAt,
      joinFrom: gate.joinFrom,
      joinUntil: gate.joinUntil,
      createdById: auth.user.id,
    })
    if (session.status === "ENDED" || session.status === "CANCELLED") {
      return jsonError("انتهت هذه الاستشارة.", 409)
    }

    const token = await issueVideoToken({
      session,
      role: gate.role,
      userName: auth.user.name,
      userId: auth.user.id,
      joinUntil: gate.joinUntil,
    })

    return jsonOk({
      token: token.token,
      expiresAt: token.expiresAt.toISOString(),
      roomUrl: session.roomUrl,
      role: gate.role,
      doctorName: gate.ctx.doctorName,
    })
  } catch {
    return jsonError("تعذر تجهيز الاستشارة الآن. حاول مرة أخرى.", 500)
  }
}
