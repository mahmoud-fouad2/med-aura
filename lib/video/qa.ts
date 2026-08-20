import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { qaVideoJoinTicket, user as userTable } from "@/lib/db/schema"
import { writeAudit, requestMeta } from "@/lib/audit"
import { getVideoProvider } from "./index"

/**
 * QA-only video sessions: a real Daily room + single-use launch tickets for
 * two isTest=true accounts, with no appointment, payment, or production
 * video_session row involved at all. Isolated from the real consultation data model
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
    readonly code = "VIDEO_QA_FAILED",
  ) {
    super(message)
  }
}

export function qaTicketDigest(ticket: string): string {
  return createHash("sha256").update(ticket).digest("hex")
}

function createJoinTicket(): { raw: string; digest: string } {
  const raw = randomBytes(32).toString("base64url")
  return { raw, digest: qaTicketDigest(raw) }
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
  const patientTicket = createJoinTicket()
  const doctorTicket = createJoinTicket()

  try {
    await db.insert(qaVideoJoinTicket).values([
      {
        ticketHash: patientTicket.digest,
        roomName: room.roomName,
        roomUrl: room.roomUrl,
        userId: patient.id,
        role: "patient",
        expiresAt,
        createdById: input.actorUserId,
      },
      {
        ticketHash: doctorTicket.digest,
        roomName: room.roomName,
        roomUrl: room.roomUrl,
        userId: doctor.id,
        role: "doctor",
        expiresAt,
        createdById: input.actorUserId,
      },
    ])
  } catch (error) {
    await provider.endRoom(room.roomName).catch(() => undefined)
    throw error
  }

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
    patient: { userId: patient.id, name: patient.name, ticket: patientTicket.raw },
    doctor: { userId: doctor.id, name: doctor.name, ticket: doctorTicket.raw },
  }
}

export async function exchangeQaJoinTicket(input: {
  ticket: string
  actorUserId: string
}) {
  const digest = qaTicketDigest(input.ticket)
  const now = new Date()
  const candidate = (
    await db
      .select({
        id: qaVideoJoinTicket.id,
        roomName: qaVideoJoinTicket.roomName,
        roomUrl: qaVideoJoinTicket.roomUrl,
        role: qaVideoJoinTicket.role,
        expiresAt: qaVideoJoinTicket.expiresAt,
      })
      .from(qaVideoJoinTicket)
      .where(
        and(
          eq(qaVideoJoinTicket.ticketHash, digest),
          eq(qaVideoJoinTicket.userId, input.actorUserId),
          isNull(qaVideoJoinTicket.consumedAt),
          gt(qaVideoJoinTicket.expiresAt, now),
        ),
      )
      .limit(1)
  )[0]

  if (!candidate || (candidate.role !== "patient" && candidate.role !== "doctor")) {
    throw new QaVideoError(
      "رابط جلسة الاختبار غير صالح أو استُخدم من قبل.",
      410,
      "VIDEO_QA_TICKET_INVALID",
    )
  }

  const participant = await requireTestUser(input.actorUserId, candidate.role)
  const provider = getVideoProvider()
  if (!provider) throw new QaVideoError("مزوّد الفيديو غير مفعّل حاليًا.", 503)

  const consumed = await db
    .update(qaVideoJoinTicket)
    .set({ consumedAt: now })
    .where(
      and(
        eq(qaVideoJoinTicket.id, candidate.id),
        isNull(qaVideoJoinTicket.consumedAt),
        gt(qaVideoJoinTicket.expiresAt, now),
      ),
    )
    .returning({ id: qaVideoJoinTicket.id })

  if (consumed.length !== 1) {
    throw new QaVideoError(
      "رابط جلسة الاختبار استُخدم من قبل.",
      409,
      "VIDEO_QA_TICKET_CONSUMED",
    )
  }

  let participantToken
  try {
    participantToken = await provider.createParticipantToken({
      roomName: candidate.roomName,
      userName: participant.name,
      role: candidate.role,
      expiresAt: candidate.expiresAt,
    })
  } catch (error) {
    // A provider outage must not burn the one-time link. Only restore this
    // exact reservation; a later successful consumer cannot be reopened.
    await db
      .update(qaVideoJoinTicket)
      .set({ consumedAt: null })
      .where(
        and(
          eq(qaVideoJoinTicket.id, candidate.id),
          eq(qaVideoJoinTicket.consumedAt, now),
        ),
      )
      .catch(() => undefined)
    throw error
  }

  const meta = await requestMeta()
  await writeAudit({
    action: "video_qa.ticket_consumed",
    actorUserId: input.actorUserId,
    entityType: "qa_video_room",
    entityId: candidate.roomName,
    metadata: { role: candidate.role },
    ...meta,
  })

  return {
    roomName: candidate.roomName,
    roomUrl: candidate.roomUrl,
    role: candidate.role,
    token: participantToken.token,
    expiresAt: candidate.expiresAt,
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

  await db
    .update(qaVideoJoinTicket)
    .set({ consumedAt: new Date() })
    .where(and(eq(qaVideoJoinTicket.roomName, input.roomName), isNull(qaVideoJoinTicket.consumedAt)))
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

  const participant = (
    await db
      .select({ role: qaVideoJoinTicket.role })
      .from(qaVideoJoinTicket)
      .where(
        and(
          eq(qaVideoJoinTicket.roomName, input.roomName),
          eq(qaVideoJoinTicket.userId, input.actorUserId),
          isNotNull(qaVideoJoinTicket.consumedAt),
        ),
      )
      .limit(1)
  )[0]
  if (
    !participant ||
    (participant.role !== "patient" && participant.role !== "doctor") ||
    !input.event.startsWith(`${participant.role}_`)
  ) {
    throw new QaVideoError("الحدث لا يطابق مشارك جلسة الاختبار.", 403)
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
