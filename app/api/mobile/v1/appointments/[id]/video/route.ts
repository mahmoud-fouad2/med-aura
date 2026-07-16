import type { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { videoSession } from "@/lib/db/schema"
import { isVideoConfigured } from "@/lib/env"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"
import { videoJoinWindow } from "@/lib/video"
import { decideVideoAccess, loadVideoContext } from "@/lib/video/service"

export const dynamic = "force-dynamic"

/**
 * Video state for one appointment — everything the pre-join screen needs to
 * render honestly: is this a video visit, is the viewer allowed, is it time,
 * and when does the window open/close. Never exposes room ids or tokens.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const ctx = await loadVideoContext(id, auth.user)

    // An outsider learns nothing — same response as a missing appointment.
    if (!ctx.appointment || !ctx.viewerRole) {
      return jsonError("الموعد غير موجود.", 404)
    }

    const decision = decideVideoAccess({
      appointment: ctx.appointment,
      viewerRole: ctx.viewerRole,
      providerReady: isVideoConfigured(),
      now: new Date(),
      window: videoJoinWindow(),
    })

    const session = (
      await db
        .select({
          status: videoSession.status,
          patientJoinedAt: videoSession.patientJoinedAt,
          doctorJoinedAt: videoSession.doctorJoinedAt,
        })
        .from(videoSession)
        .where(eq(videoSession.appointmentId, ctx.appointment.id))
        .limit(1)
    )[0]

    return jsonOk({
      isVideoAppointment: ctx.appointment.type === "VIDEO_CONSULTATION",
      configured: isVideoConfigured(),
      role: ctx.viewerRole,
      allowed: decision.allowed,
      reason: decision.allowed ? null : decision.reason,
      joinAvailableFrom: decision.joinFrom?.toISOString() ?? null,
      joinAvailableUntil: decision.joinUntil?.toISOString() ?? null,
      startsAt: ctx.appointment.startsAt.toISOString(),
      endsAt: ctx.appointment.endsAt.toISOString(),
      doctorName: ctx.appointment.doctorName,
      counterpartJoined: session
        ? ctx.viewerRole === "patient"
          ? session.doctorJoinedAt != null
          : session.patientJoinedAt != null
        : false,
      callStatus: session?.status ?? null,
    })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
