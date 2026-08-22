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
  check,
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
  (t) => [
    index("availability_doctor_idx").on(t.doctorId),
    check("availability_day_range", sql`${t.dayOfWeek} between 0 and 6`),
    check("availability_time_order", sql`${t.startTime} < ${t.endTime}`),
    check("availability_slot_range", sql`${t.slotMinutes} between 5 and 480`),
  ],
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
    paymentExpiresAt: timestamp("paymentExpiresAt", { withTimezone: true }),
    priceAmount: numeric("priceAmount", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("SAR"),
    patientNote: text("patientNote"),
    ...lifecycle(),
  },
  (t) => [
    index("appointment_patient_idx").on(t.patientUserId),
    index("appointment_doctor_idx").on(t.doctorId),
    index("appointment_starts_idx").on(t.startsAt),
    index("appointment_payment_expiry_idx").on(t.status, t.paymentExpiresAt),
    check("appointment_time_order", sql`${t.startsAt} < ${t.endsAt}`),
    check(
      "appointment_price_nonnegative",
      sql`${t.priceAmount} is null or ${t.priceAmount} >= 0`,
    ),
    // Hard guarantee against double-booking: only statuses that actively or
    // historically occupy a slot participate in the unique index. Using an
    // allow-list also keeps future terminal statuses re-bookable by default.
    uniqueIndex("appointment_no_double_booking")
      .on(t.doctorId, t.startsAt)
      .where(
        sql`status IN ('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS','COMPLETED','RESCHEDULED')`,
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
