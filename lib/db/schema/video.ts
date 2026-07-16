import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { lifecycle } from "./_shared"
import { user } from "./auth"
import { appointment } from "./scheduling"

/**
 * Video consultation sessions. One session per appointment — the room is
 * created lazily the first time an authorized participant asks for it, and
 * every access decision (who, when) is made server-side in lib/video/service.
 *
 * Provider-agnostic by design: `provider` names the adapter that owns
 * `providerRoomId`/`roomUrl`, so a provider switch never requires a schema
 * change. Access tokens are NEVER stored — they are minted per-join with a
 * short expiry and handed straight to the client.
 */

export const videoSessionStatusEnum = pgEnum("video_session_status", [
  "SCHEDULED",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
])

export const videoSession = pgTable(
  "video_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    appointmentId: text("appointmentId")
      .notNull()
      .references(() => appointment.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    roomName: text("roomName").notNull(),
    providerRoomId: text("providerRoomId"),
    /** Join URL for the provider room — useless without a fresh token. */
    roomUrl: text("roomUrl"),
    status: videoSessionStatusEnum("status").notNull().default("SCHEDULED"),
    scheduledStartAt: timestamp("scheduledStartAt", { withTimezone: true }).notNull(),
    scheduledEndAt: timestamp("scheduledEndAt", { withTimezone: true }).notNull(),
    joinAvailableFrom: timestamp("joinAvailableFrom", { withTimezone: true }).notNull(),
    joinAvailableUntil: timestamp("joinAvailableUntil", { withTimezone: true }).notNull(),
    startedAt: timestamp("startedAt", { withTimezone: true }),
    endedAt: timestamp("endedAt", { withTimezone: true }),
    patientJoinedAt: timestamp("patientJoinedAt", { withTimezone: true }),
    doctorJoinedAt: timestamp("doctorJoinedAt", { withTimezone: true }),
    lastConnectionState: text("lastConnectionState"),
    createdById: text("createdById").references(() => user.id, {
      onDelete: "set null",
    }),
    ...lifecycle(),
  },
  (t) => [
    // One room per appointment, ever — a second concurrent "create" request
    // must fail at the database, not just in application logic.
    uniqueIndex("video_session_appointment_uq").on(t.appointmentId),
    uniqueIndex("video_session_room_uq").on(t.roomName),
    index("video_session_status_idx").on(t.status),
  ],
)

/** Participant-level call events (joined/left/media toggles/connection). */
export const videoSessionEvent = pgTable(
  "video_session_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    videoSessionId: text("videoSessionId")
      .notNull()
      .references(() => videoSession.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // patient | doctor | staff
    event: text("event").notNull(), // joined | left | camera_on | camera_off | mic_on | mic_off | connection_lost | reconnected | ended
    deviceType: text("deviceType"), // android | ios | web
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("video_event_session_idx").on(t.videoSessionId)],
)
