import type { NextRequest } from "next/server"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"
import { authorizeVideoJoin, ensureVideoSession } from "@/lib/video/service"

export const dynamic = "force-dynamic"

/**
 * Get-or-create the appointment's video room. Only reachable by the
 * appointment's patient, its doctor, or oversight staff — and only inside
 * the join window. Idempotent: one room per appointment, ever.
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

    return jsonOk({
      status: session.status,
      joinAvailableFrom: session.joinAvailableFrom.toISOString(),
      joinAvailableUntil: session.joinAvailableUntil.toISOString(),
    })
  } catch {
    return jsonError("تعذر تجهيز الاستشارة الآن. حاول مرة أخرى.", 500)
  }
}
