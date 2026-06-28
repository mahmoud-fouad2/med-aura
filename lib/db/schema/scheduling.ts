import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  time,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import {
  lifecycle,
  appointmentTypeEnum,
  appointmentStatusEnum,
} from "./_shared"
import { user } from "./auth"
import { doctorProfile, center } from "./providers"
import { aestheticCase } from "./cases"

/** Recurring weekly availability for a doctor (section 19). */
export const availabilityRule = pgTable(
  "availability_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    doctorId: text("doctorId")
      .notNull()
      .references(() => doctorProfile.id, { onDelete: "cascade" }),
    // 0 = Sunday … 6 = Saturday
    dayOfWeek: integer("dayOfWeek").notNull(),
    startTime: time("startTime").notNull(),
    endTime: time("endTime").notNull(),
    slotMinutes: integer("slotMinutes").notNull().default(30),
    type: appointmentTypeEnum("type").notNull().default("VIDEO_CONSULTATION"),
    active: boolean("active").notNull().default(true),
    ...lifecycle(),
  },
  (t) => [index("availability_doctor_idx").on(t.doctorId)],
)

export const appointment = pgTable(
  "appointment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reference: text("reference").notNull().unique(),
    caseId: text("caseId").references(() => aestheticCase.id, {
      onDelete: "set null",
    }),
    patientUserId: text("patientUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    doctorId: text("doctorId")
      .notNull()
      .references(() => doctorProfile.id, { onDelete: "restrict" }),
    centerId: text("centerId").references(() => center.id, {
      onDelete: "set null",
    }),
    type: appointmentTypeEnum("type").notNull().default("VIDEO_CONSULTATION"),
    status: appointmentStatusEnum("status")
      .notNull()
      .default("PENDING_PAYMENT"),
    startsAt: timestamp("startsAt", { withTimezone: true }).notNull(),
    endsAt: timestamp("endsAt", { withTimezone: true }).notNull(),
    priceAmount: numeric("priceAmount", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("SAR"),
    patientNote: text("patientNote"),
    ...lifecycle(),
  },
  (t) => [
    index("appointment_patient_idx").on(t.patientUserId),
    index("appointment_doctor_idx").on(t.doctorId),
    index("appointment_starts_idx").on(t.startsAt),
    // Hard guarantee against double-booking: a doctor cannot have two
    // non-cancelled appointments at the same start time. Cancelled / no-show
    // slots are excluded so they can be re-booked.
    uniqueIndex("appointment_no_double_booking")
      .on(t.doctorId, t.startsAt)
      .where(
        sql`status NOT IN ('CANCELLED_BY_PATIENT','CANCELLED_BY_PROVIDER','NO_SHOW')`,
      ),
  ],
)

export const appointmentStatusHistory = pgTable(
  "appointment_status_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    appointmentId: text("appointmentId")
      .notNull()
      .references(() => appointment.id, { onDelete: "cascade" }),
    fromStatus: appointmentStatusEnum("fromStatus"),
    toStatus: appointmentStatusEnum("toStatus").notNull(),
    changedBy: text("changedBy"),
    note: text("note"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("appt_history_appt_idx").on(t.appointmentId)],
)
