import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  appointment,
  doctorProfile,
  videoSession,
  videoSessionEvent,
} from "@/lib/db/schema"
import { PERMISSIONS, hasPermission } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import type { SessionUser } from "@/lib/session"
import { getVideoProvider, videoJoinWindow, type VideoRole } from "./index"

/**
 * All video-consultation business rules live here — the API routes are thin
 * shells. Every decision (who may join, when, with what role) happens
 * server-side; clients only ever receive the verdict and, when allowed, a
 * short-lived token.
 */

/* ── Access decision (pure — unit-tested without a database) ─────────────── */

export type VideoDenyReason =
  | "not_found"
  | "not_authorized"
  | "not_video"
  | "disabled"
  | "not_confirmed"
  | "cancelled"
  | "too_early"
  | "expired"

export type VideoAccessDecision =
  | { allowed: true; role: VideoRole; joinFrom: Date; joinUntil: Date }
  | { allowed: false; reason: VideoDenyReason; joinFrom?: Date; joinUntil?: Date }

const JOINABLE_STATUSES = new Set(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"])
const DEAD_STATUSES = new Set([
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PROVIDER",
  "NO_SHOW",
])

export function decideVideoAccess(input: {
  appointment: {
    type: string
    status: string
    startsAt: Date
    endsAt: Date
  } | null
  viewerRole: VideoRole | null
  providerReady: boolean
  now: Date
  window: { beforeMinutes: number; afterMinutes: number }
}): VideoAccessDecision {
  const { appointment: appt, viewerRole, providerReady, now, window } = input

  if (!appt) return { allowed: false, reason: "not_found" }
  // Authorization before anything else: an outsider learns nothing about
  // this appointment — not even whether it's a video one.
  if (!viewerRole) return { allowed: false, reason: "not_authorized" }
  if (appt.type !== "VIDEO_CONSULTATION") {
    return { allowed: false, reason: "not_video" }
  }
  if (!providerReady) return { allowed: false, reason: "disabled" }

  const joinFrom = new Date(
    appt.startsAt.getTime() - window.beforeMinutes * 60_000,
  )
  const joinUntil = new Date(
    appt.endsAt.getTime() + window.afterMinutes * 60_000,
  )

  if (DEAD_STATUSES.has(appt.status)) {
    return { allowed: false, reason: "cancelled", joinFrom, joinUntil }
  }
  if (appt.status === "COMPLETED") {
    return { allowed: false, reason: "expired", joinFrom, joinUntil }
  }
  if (!JOINABLE_STATUSES.has(appt.status)) {
    return { allowed: false, reason: "not_confirmed", joinFrom, joinUntil }
  }
  if (now < joinFrom) {
    return { allowed: false, reason: "too_early", joinFrom, joinUntil }
  }
  if (now > joinUntil) {
    return { allowed: false, reason: "expired", joinFrom, joinUntil }
  }
  return { allowed: true, role: viewerRole, joinFrom, joinUntil }
}

/* ── DB-backed context ────────────────────────────────────────────────────── */

type AppointmentContext = {
  appointment: {
    id: string
    reference: string
    type: string
    status: string
    startsAt: Date
    endsAt: Date
    patientUserId: string
    doctorUserId: string
    doctorName: string
  } | null
  viewerRole: VideoRole | null
}

/** Loads the appointment and resolves the viewer's relationship to it. */
export async function loadVideoContext(
  appointmentId: string,
  viewer: SessionUser,
): Promise<AppointmentContext> {
  const row = (
    await db
      .select({
        id: appointment.id,
        reference: appointment.reference,
        type: appointment.type,
        status: appointment.status,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        patientUserId: appointment.patientUserId,
        doctorUserId: doctorProfile.userId,
        doctorName: doctorProfile.name,
      })
      .from(appointment)
      .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
      .where(eq(appointment.id, appointmentId))
      .limit(1)
  )[0]

  if (!row) return { appointment: null, viewerRole: null }

  let viewerRole: VideoRole | null = null
  if (row.patientUserId === viewer.id) viewerRole = "patient"
  else if (row.doctorUserId === viewer.id) viewerRole = "doctor"
  else if (await hasPermission(viewer.id, PERMISSIONS.APPOINTMENT_READ_ANY)) {
    viewerRole = "staff"
  }

  return { appointment: row, viewerRole }
}

/* ── Humane copy for every deny reason (no technical terms, ever) ─────────── */

export function denyMessage(
  reason: VideoDenyReason,
  beforeMinutes: number,
): string {
  switch (reason) {
    case "too_early":
      return `الاستشارة غير متاحة بعد. يمكنك الدخول قبل الموعد بـ ${beforeMinutes} دقائق.`
    case "expired":
      return "انتهت نافذة الدخول لهذه الاستشارة."
    case "disabled":
      return "الاستشارات عن بُعد غير مفعّلة حاليًا. تواصلي مع الدعم."
    case "not_video":
      return "هذا الموعد ليس استشارة عن بُعد."
    case "cancelled":
      return "هذا الموعد لم يعد قائمًا."
    case "not_confirmed":
      return "بانتظار تأكيد الموعد قبل تفعيل الاستشارة."
    case "not_found":
    case "not_authorized":
      return "الموعد غير موجود."
  }
}

/**
 * One gate for the join-path endpoints (session + token): resolves the
 * viewer, applies the full access decision, audits denials, and hands back
 * either the context or a ready-to-send humane error.
 */
export async function authorizeVideoJoin(
  appointmentId: string,
  viewer: SessionUser,
): Promise<
  | {
      ok: true
      ctx: NonNullable<AppointmentContext["appointment"]>
      role: VideoRole
      joinFrom: Date
      joinUntil: Date
    }
  | { ok: false; status: number; message: string; reason: VideoDenyReason }
> {
  const { isVideoConfigured } = await import("@/lib/env")
  const window = videoJoinWindow()
  const { appointment: appt, viewerRole } = await loadVideoContext(
    appointmentId,
    viewer,
  )
  const decision = decideVideoAccess({
    appointment: appt,
    viewerRole,
    providerReady: isVideoConfigured(),
    now: new Date(),
    window,
  })
  if (!decision.allowed) {
    // Denials on real appointments are audit-worthy; probing invisible ones
    // is answered with a plain 404 and no audit noise.
    if (appt && viewerRole) {
      await auditVideoDenied({
        userId: viewer.id,
        appointmentId,
        reason: decision.reason,
      })
    }
    const hidden =
      decision.reason === "not_found" || decision.reason === "not_authorized"
    return {
      ok: false,
      status: hidden ? 404 : 409,
      message: denyMessage(decision.reason, window.beforeMinutes),
      reason: decision.reason,
    }
  }
  return {
    ok: true,
    ctx: appt!,
    role: decision.role,
    joinFrom: decision.joinFrom,
    joinUntil: decision.joinUntil,
  }
}

/* ── Session lifecycle ────────────────────────────────────────────────────── */

function roomNameFor(appointmentId: string): string {
  return `medaura-appt-${appointmentId}`
}

/**
 * Get-or-create the appointment's video room. Idempotent under concurrency:
 * the unique index on appointmentId makes the second creator re-read instead
 * of duplicating rooms.
 */
export async function ensureVideoSession(input: {
  appointmentId: string
  scheduledStartAt: Date
  scheduledEndAt: Date
  joinFrom: Date
  joinUntil: Date
  createdById: string
}) {
  const existing = (
    await db
      .select()
      .from(videoSession)
      .where(eq(videoSession.appointmentId, input.appointmentId))
      .limit(1)
  )[0]
  if (existing && existing.status !== "CANCELLED") return existing

  const provider = getVideoProvider()
  if (!provider) throw new Error("video provider disabled")

  const room = await provider.createRoom({
    roomName: roomNameFor(input.appointmentId),
    notBefore: input.joinFrom,
    expiresAt: input.joinUntil,
  })

  try {
    const inserted = (
      await db
        .insert(videoSession)
        .values({
          appointmentId: input.appointmentId,
          provider: provider.id,
          roomName: room.roomName,
          providerRoomId: room.providerRoomId,
          roomUrl: room.roomUrl,
          scheduledStartAt: input.scheduledStartAt,
          scheduledEndAt: input.scheduledEndAt,
          joinAvailableFrom: input.joinFrom,
          joinAvailableUntil: input.joinUntil,
          createdById: input.createdById,
        })
        .returning()
    )[0]
    // A successful INSERT ... RETURNING always yields the row; guard anyway so
    // the return type is non-nullable for every caller (token issuance).
    if (!inserted) throw new Error("video session insert returned no row")

    const meta = await requestMeta()
    await writeAudit({
      action: "video.room_created",
      actorUserId: input.createdById,
      entityType: "video_session",
      entityId: inserted.id,
      metadata: { appointmentId: input.appointmentId, provider: provider.id },
      ...meta,
    })
    return inserted
  } catch (err) {
    // Unique-violation race: someone else inserted first — theirs wins.
    const again = (
      await db
        .select()
        .from(videoSession)
        .where(eq(videoSession.appointmentId, input.appointmentId))
        .limit(1)
    )[0]
    if (again) return again
    throw err
  }
}

/** Mints a short-lived join token; never stored, expires with the window. */
export async function issueVideoToken(input: {
  session: typeof videoSession.$inferSelect
  role: VideoRole
  userName: string
  userId: string
  joinUntil: Date
}) {
  const provider = getVideoProvider()
  if (!provider) throw new Error("video provider disabled")

  const token = await provider.createParticipantToken({
    roomName: input.session.roomName,
    userName: input.userName,
    role: input.role,
    expiresAt: input.joinUntil,
  })

  const meta = await requestMeta()
  await writeAudit({
    action: "video.token_issued",
    actorUserId: input.userId,
    entityType: "video_session",
    entityId: input.session.id,
    metadata: { role: input.role },
    ...meta,
  })
  return token
}

export async function auditVideoDenied(input: {
  userId: string
  appointmentId: string
  reason: VideoDenyReason
}) {
  const meta = await requestMeta()
  await writeAudit({
    action: "video.join_denied",
    actorUserId: input.userId,
    entityType: "appointment",
    entityId: input.appointmentId,
    metadata: { reason: input.reason },
    ...meta,
  })
}

/* ── Call events ──────────────────────────────────────────────────────────── */

export const VIDEO_EVENTS = new Set([
  "joined",
  "left",
  "camera_on",
  "camera_off",
  "mic_on",
  "mic_off",
  "connection_lost",
  "reconnected",
  "ended",
])

export async function recordVideoEvent(input: {
  sessionId: string
  userId: string
  role: VideoRole
  event: string
  deviceType?: string
  counterpart?: { userId: string; name: string; appointmentId: string }
}) {
  await db.insert(videoSessionEvent).values({
    videoSessionId: input.sessionId,
    userId: input.userId,
    role: input.role,
    event: input.event,
    deviceType: input.deviceType ?? null,
  })

  const now = new Date()
  if (input.event === "joined") {
    // First join flips the session live.
    await db
      .update(videoSession)
      .set({ status: "ACTIVE", startedAt: now, updatedAt: now })
      .where(
        and(eq(videoSession.id, input.sessionId), eq(videoSession.status, "SCHEDULED")),
      )
    // First-join timestamps only — a rejoin must not rewrite history.
    if (input.role === "patient") {
      await db
        .update(videoSession)
        .set({ patientJoinedAt: now, updatedAt: now })
        .where(
          and(eq(videoSession.id, input.sessionId), isNull(videoSession.patientJoinedAt)),
        )
    } else if (input.role === "doctor") {
      await db
        .update(videoSession)
        .set({ doctorJoinedAt: now, updatedAt: now })
        .where(
          and(eq(videoSession.id, input.sessionId), isNull(videoSession.doctorJoinedAt)),
        )
    }
    await db
      .update(videoSession)
      .set({ lastConnectionState: "connected", updatedAt: now })
      .where(eq(videoSession.id, input.sessionId))

    // Tell the other side their counterpart is in the waiting room.
    if (input.counterpart) {
      await notify({
        userId: input.counterpart.userId,
        type: "VIDEO_COUNTERPART_JOINED",
        title:
          input.role === "doctor"
            ? "طبيبك انضم إلى الاستشارة"
            : "المريض انضم إلى الاستشارة",
        body: "يمكنك الدخول الآن لبدء المكالمة.",
        href: `/dashboard/appointments`,
      })
    }
  } else if (input.event === "connection_lost") {
    await db
      .update(videoSession)
      .set({ lastConnectionState: "connection_lost", updatedAt: now })
      .where(eq(videoSession.id, input.sessionId))
  } else if (input.event === "reconnected") {
    await db
      .update(videoSession)
      .set({ lastConnectionState: "connected", updatedAt: now })
      .where(eq(videoSession.id, input.sessionId))
  } else if (input.event === "left") {
    await db
      .update(videoSession)
      .set({ lastConnectionState: "left", updatedAt: now })
      .where(eq(videoSession.id, input.sessionId))
  } else if (input.event === "ended") {
    // Only the care side may end the call for everyone.
    if (input.role === "doctor" || input.role === "staff") {
      await db
        .update(videoSession)
        .set({ status: "ENDED", endedAt: now, updatedAt: now })
        .where(eq(videoSession.id, input.sessionId))
      const provider = getVideoProvider()
      const row = (
        await db
          .select({ roomName: videoSession.roomName })
          .from(videoSession)
          .where(eq(videoSession.id, input.sessionId))
          .limit(1)
      )[0]
      if (provider && row) {
        await provider.endRoom(row.roomName).catch(() => undefined)
      }
      const meta = await requestMeta()
      await writeAudit({
        action: "video.ended",
        actorUserId: input.userId,
        entityType: "video_session",
        entityId: input.sessionId,
        metadata: { by: input.role },
        ...meta,
      })
    }
  }
}
