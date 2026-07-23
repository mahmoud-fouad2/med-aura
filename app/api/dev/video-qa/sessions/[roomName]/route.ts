import { getCurrentUser } from "@/lib/session"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { isVideoQaEnabled } from "@/lib/env"
import { endQaSession, QaVideoError } from "@/lib/video/qa"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** QA-ONLY: end and clean up a test video room. Same triple gate as creation. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomName: string }> },
) {
  if (!isVideoQaEnabled()) return jsonError("غير موجود.", 404)

  const user = await getCurrentUser()
  if (!user) return jsonError("انتهت الجلسة. سجّل الدخول مرة أخرى.", 401)
  if (!(await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS))) {
    return jsonError("هذا الإجراء غير متاح لحسابك.", 403)
  }

  const { roomName } = await params
  try {
    await endQaSession({ roomName, actorUserId: user.id })
    return jsonOk({ ended: true })
  } catch (err) {
    if (err instanceof QaVideoError) return jsonError(err.message, err.status)
    return jsonError("تعذّر إنهاء جلسة الاختبار.", 500)
  }
}
