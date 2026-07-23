import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { writeAudit, requestMeta } from "@/lib/audit"
import { getVideoProvider } from "./index"

/**
 * QA-only video sessions: a real Daily room + tokens for two isTest=true
 * accounts, with no appointment, payment, or production video_session row
 * involved at all. Entirely isolated from the real consultation data model
 * (lib/video/service.ts) so a bug here can never touch a real booking.
 *
 * Every entry point is gated by `isVideoQaEnabled()` at the route level —
 * this module has no opinion on that and must not be called without it.
 */

const QA_ROOM_MINUTES = 30

export type QaRole = "patient" | "doctor"

export class QaVideoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function requireTestUser(userId: string, expectedRole: QaRole) {
  const row = (
    await db
      .select({ id: userTable.id, name: userTable.name, role: userTable.role, isTest: userTable.isTest })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)
  )[0]
  if (!row) throw new QaVideoError("الحساب غير موجود.", 404)
  if (!row.isTest) {
    throw new QaVideoError("هذا الحساب ليس حساب اختبار (isTest).", 403)
  }
  if (row.role !== expectedRole) {
    throw new QaVideoError("دور الحساب لا يطابق الدور المطلوب.", 400)
  }
  return row
}

function qaRoomName(): string {
  return `medaura-qa-${crypto.randomUUID()}`
}

export async function createQaSession(input: {
  patientUserId: string
  doctorUserId: string
  actorUserId: string
}) {
  const [patient, doctor] = await Promise.all([
    requireTestUser(input.patientUserId, "patient"),
    requireTestUser(input.doctorUserId, "doctor"),
  ])

  const provider = getVideoProvider()
  if (!provider) throw new QaVideoError("مزوّد الفيديو غير مفعّل حاليًا.", 503)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + QA_ROOM_MINUTES * 60_000)
  const roomName = qaRoomName()

  const room = await provider.createRoom({ roomName, notBefore: now, expiresAt })
  const [patientToken, doctorToken] = await Promise.all([
    provider.createParticipantToken({
      roomName: room.roomName,
      userName: patient.name,
      role: "patient",
      expiresAt,
    }),
    provider.createParticipantToken({
      roomName: room.roomName,
      userName: doctor.name,
      role: "doctor",
      expiresAt,
    }),
  ])

  const meta = await requestMeta()
  await writeAudit({
    action: "video_qa.room_created",
    actorUserId: input.actorUserId,
    entityType: "qa_video_room",
    entityId: room.roomName,
    metadata: {
      patientUserId: patient.id,
      doctorUserId: doctor.id,
      expiresAt: expiresAt.toISOString(),
    },
    ...meta,
  })

  return {
    roomName: room.roomName,
    roomUrl: room.roomUrl,
    expiresAt,
    patient: { userId: patient.id, name: patient.name, token: patientToken.token },
    doctor: { userId: doctor.id, name: doctor.name, token: doctorToken.token },
  }
}

export async function endQaSession(input: { roomName: string; actorUserId: string }) {
  if (!input.roomName.startsWith("medaura-qa-")) {
    // Refuse to touch anything that isn't one of ours — in particular, a
    // real appointment's `medaura-appt-*` room.
    throw new QaVideoError("اسم الغرفة غير صالح لأداة الاختبار.", 400)
  }
  const provider = getVideoProvider()
  if (!provider) throw new QaVideoError("مزوّد الفيديو غير مفعّل حاليًا.", 503)

  await provider.endRoom(input.roomName)

  const meta = await requestMeta()
  await writeAudit({
    action: "video_qa.room_ended",
    actorUserId: input.actorUserId,
    entityType: "qa_video_room",
    entityId: input.roomName,
    ...meta,
  })
}

const QA_EVENTS = new Set([
  "patient_joined",
  "doctor_joined",
  "patient_left",
  "doctor_left",
])

export async function recordQaEvent(input: {
  roomName: string
  actorUserId: string
  event: string
}) {
  if (!input.roomName.startsWith("medaura-qa-")) {
    throw new QaVideoError("اسم الغرفة غير صالح لأداة الاختبار.", 400)
  }
  if (!QA_EVENTS.has(input.event)) {
    throw new QaVideoError("حدث غير معروف.", 400)
  }
  const meta = await requestMeta()
  await writeAudit({
    action: `video_qa.${input.event}`,
    actorUserId: input.actorUserId,
    entityType: "qa_video_room",
    entityId: input.roomName,
    ...meta,
  })
}
