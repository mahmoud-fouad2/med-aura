import type { NextRequest } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { videoSession } from "@/lib/db/schema"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"
import {
  loadVideoContext,
  recordVideoEvent,
  VIDEO_EVENTS,
} from "@/lib/video/service"

export const dynamic = "force-dynamic"

const EventSchema = z.object({
  event: z.string().refine((e) => VIDEO_EVENTS.has(e), "unknown event"),
  deviceType: z.enum(["android", "ios", "web"]).optional(),
})

/**
 * Call telemetry from participants (joined/left/media/connection/ended).
 * Requires a real relationship to the appointment, but deliberately not the
 * join window — an "ended"/"left" arriving after the window closes is normal.
 * No media content, no free text: only whitelisted event names are stored.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = EventSchema.safeParse(body)
    if (!parsed.success) return jsonError("طلب غير صالح.", 400)

    const ctx = await loadVideoContext(id, auth.user)
    if (!ctx.appointment || !ctx.viewerRole) {
      return jsonError("الموعد غير موجود.", 404)
    }

    const session = (
      await db
        .select()
        .from(videoSession)
        .where(eq(videoSession.appointmentId, ctx.appointment.id))
        .limit(1)
    )[0]
    if (!session) return jsonError("الاستشارة غير مهيأة بعد.", 409)

    await recordVideoEvent({
      sessionId: session.id,
      userId: auth.user.id,
      role: ctx.viewerRole,
      event: parsed.data.event,
      deviceType: parsed.data.deviceType,
      counterpart:
        parsed.data.event === "joined"
          ? ctx.viewerRole === "patient"
            ? {
                userId: ctx.appointment.doctorUserId,
                name: ctx.appointment.doctorName,
                appointmentId: ctx.appointment.id,
              }
            : ctx.viewerRole === "doctor"
              ? {
                  userId: ctx.appointment.patientUserId,
                  name: "",
                  appointmentId: ctx.appointment.id,
                }
              : undefined
          : undefined,
    })

    return jsonOk({ recorded: true })
  } catch {
    return jsonError("تعذر إتمام العملية.", 500)
  }
}
