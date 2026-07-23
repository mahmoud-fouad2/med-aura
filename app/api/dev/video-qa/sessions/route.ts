import { z } from "zod"
import { getCurrentUser } from "@/lib/session"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { isVideoQaEnabled } from "@/lib/env"
import { createQaSession, QaVideoError } from "@/lib/video/qa"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * QA-ONLY: create a real (but time-boxed, isTest-only) Daily video room to
 * exercise the actual camera/mic/network call path with two test accounts —
 * no appointment, no payment, no production video_session row.
 *
 * Triple-gated exactly like the test-payment tool:
 *   1. Hidden unless ENABLE_VIDEO_QA_TOOLS=true (otherwise 404).
 *   2. Requires an admin session (ADMIN_ACCESS).
 *   3. Both accounts must be isTest=true with the matching role — see
 *      lib/video/qa.ts. Every creation is audited (video_qa.room_created).
 */
const BodySchema = z.object({
  patientUserId: z.string().min(1),
  doctorUserId: z.string().min(1),
})

export async function POST(request: Request) {
  if (!isVideoQaEnabled()) return jsonError("غير موجود.", 404)

  const user = await getCurrentUser()
  if (!user) return jsonError("انتهت الجلسة. سجّل الدخول مرة أخرى.", 401)
  if (!(await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS))) {
    return jsonError("هذا الإجراء غير متاح لحسابك.", 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return jsonError("بيانات غير صحيحة.", 400)

  try {
    const session = await createQaSession({
      patientUserId: parsed.data.patientUserId,
      doctorUserId: parsed.data.doctorUserId,
      actorUserId: user.id,
    })
    const linkFor = (role: "patient" | "doctor", token: string) => {
      const sp = new URLSearchParams({
        room: session.roomName,
        url: session.roomUrl,
        token,
        role,
      })
      return `medaura://qa-video?${sp.toString()}`
    }
    return jsonOk({
      roomName: session.roomName,
      expiresAt: session.expiresAt.toISOString(),
      patient: {
        name: session.patient.name,
        deepLink: linkFor("patient", session.patient.token),
      },
      doctor: {
        name: session.doctor.name,
        deepLink: linkFor("doctor", session.doctor.token),
      },
    })
  } catch (err) {
    if (err instanceof QaVideoError) return jsonError(err.message, err.status)
    return jsonError("تعذّر إنشاء جلسة الاختبار.", 500)
  }
}
