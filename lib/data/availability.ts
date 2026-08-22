import { and, eq, gte, inArray, lt, notInArray } from "drizzle-orm"
import { fromZonedTime, formatInTimeZone } from "date-fns-tz"
import { db } from "@/lib/db"
import {
  appointment,
  appointmentStatusHistory,
  availabilityRule,
  doctorProfile,
  payment,
} from "@/lib/db/schema"

export type Slot = { startsAt: string; endsAt: string; label: string }
export type RuleLite = {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotMinutes: number
}

const CANCELLED = [
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PROVIDER",
  "NO_SHOW",
  "PAYMENT_EXPIRED",
] as const

// Minimum lead time before a slot can be booked.
export const MIN_LEAD_MS = 60 * 60 * 1000 // 1 hour
export const PAYMENT_HOLD_MS = 35 * 60 * 1000

/**
 * Releases checkout holds whose Stripe session can no longer be completed.
 * Safe to call from every availability/admin read; the conditional update is
 * idempotent and only the first caller writes history.
 */
export async function expireStalePendingAppointments(now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(appointment)
      .set({ status: "PAYMENT_EXPIRED", updatedAt: now })
      .where(
        and(
          eq(appointment.status, "PENDING_PAYMENT"),
          lt(appointment.paymentExpiresAt, now),
        ),
      )
      .returning({ id: appointment.id })
    if (expired.length === 0) return 0

    const ids = expired.map((row) => row.id)
    await tx
      .update(payment)
      .set({ status: "CANCELLED", failureReason: "Checkout expired", updatedAt: now })
      .where(
        and(
          inArray(payment.appointmentId, ids),
          inArray(payment.status, ["CREATED", "PENDING", "REQUIRES_ACTION"]),
        ),
      )
    await tx.insert(appointmentStatusHistory).values(
      ids.map((appointmentId) => ({
        appointmentId,
        fromStatus: "PENDING_PAYMENT" as const,
        toStatus: "PAYMENT_EXPIRED" as const,
        note: "انتهت مهلة إتمام الدفع",
      })),
    )
    return ids.length
  })
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10))
  return { h: h || 0, m: m || 0 }
}

/**
 * Pure slot generator (no DB). Generates bookable slots from weekly rules over
 * `days` days, excluding slots already taken (by start-time ms) and slots inside
 * the lead-time window. Exported for unit testing.
 */
export function generateSlots(
  rules: RuleLite[],
  takenMs: Set<number>,
  opts: { now: Date; days: number; limit: number; timeZone?: string },
): Slot[] {
  const { now, days, limit, timeZone = "Asia/Riyadh" } = opts
  const slots: Slot[] = []
  if (rules.length === 0) return slots
  const localToday = formatInTimeZone(now, timeZone, "yyyy-MM-dd")
  const localMidnightUtc = new Date(`${localToday}T00:00:00.000Z`)

  for (let d = 0; d < days && slots.length < limit; d++) {
    const calendarDay = new Date(localMidnightUtc.getTime() + d * 86_400_000)
    const dateKey = calendarDay.toISOString().slice(0, 10)
    const dow = calendarDay.getUTCDay() // 0=Sun..6=Sat in the doctor's locale
    const dayRules = rules.filter((r) => r.dayOfWeek === dow)

    for (const rule of dayRules) {
      const { h: sh, m: sm } = parseTime(rule.startTime)
      const { h: eh, m: em } = parseTime(rule.endTime)
      const localStart = `${dateKey}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`
      const localEnd = `${dateKey}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`
      const start = fromZonedTime(localStart, timeZone)
      const end = fromZonedTime(localEnd, timeZone)

      for (
        let t = new Date(start);
        t.getTime() + rule.slotMinutes * 60000 <= end.getTime();
        t = new Date(t.getTime() + rule.slotMinutes * 60000)
      ) {
        if (t.getTime() < now.getTime() + MIN_LEAD_MS) continue
        if (takenMs.has(t.getTime())) continue
        const endsAt = new Date(t.getTime() + rule.slotMinutes * 60000)
        slots.push({
          startsAt: t.toISOString(),
          endsAt: endsAt.toISOString(),
          label: formatSlot(t, timeZone),
        })
        if (slots.length >= limit) break
      }
      if (slots.length >= limit) break
    }
  }

  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return slots
}

/** Compute bookable slots for a doctor from the database. */
export async function getAvailableSlots(
  doctorId: string,
  opts: { days?: number; type?: string; limit?: number } = {},
): Promise<Slot[]> {
  const days = opts.days ?? 21
  const limit = opts.limit ?? 40
  const now = new Date()
  await expireStalePendingAppointments(now)

  const [rules, doctor] = await Promise.all([
    db
      .select()
      .from(availabilityRule)
      .where(
        and(
          eq(availabilityRule.doctorId, doctorId),
          eq(availabilityRule.active, true),
          ...(opts.type ? [eq(availabilityRule.type, opts.type as never)] : []),
        ),
      ),
    db
      .select({ timezone: doctorProfile.timezone })
      .from(doctorProfile)
      .where(eq(doctorProfile.id, doctorId))
      .limit(1)
      .then((rows) => rows[0]),
  ])
  if (rules.length === 0) return []
  const timeZone = doctor?.timezone ?? "Asia/Riyadh"

  const taken = await db
    .select({ startsAt: appointment.startsAt })
    .from(appointment)
    .where(
      and(
        eq(appointment.doctorId, doctorId),
        gte(appointment.startsAt, now),
        notInArray(appointment.status, [...CANCELLED]),
      ),
    )
  const takenSet = new Set(taken.map((t) => new Date(t.startsAt).getTime()))

  return generateSlots(
    rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotMinutes: r.slotMinutes,
    })),
    takenSet,
    { now, days, limit, timeZone },
  )
}

export async function isSlotAvailable(
  doctorId: string,
  startsAtIso: string,
  type?: string,
): Promise<boolean> {
  const slots = await getAvailableSlots(doctorId, { type, limit: 500 })
  return slots.some((s) => s.startsAt === startsAtIso)
}

function formatSlot(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d)
}
