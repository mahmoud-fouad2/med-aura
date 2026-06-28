import { and, eq, gte, notInArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { availabilityRule, appointment } from "@/lib/db/schema"

export type Slot = { startsAt: string; endsAt: string; label: string }

const CANCELLED = [
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PROVIDER",
  "NO_SHOW",
] as const

// Minimum lead time before a slot can be booked.
const MIN_LEAD_MS = 60 * 60 * 1000 // 1 hour

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10))
  return { h: h || 0, m: m || 0 }
}

/**
 * Compute bookable slots for a doctor over the next `days` days from weekly
 * availability rules, excluding slots already taken by non-cancelled
 * appointments and slots inside the lead-time window.
 */
export async function getAvailableSlots(
  doctorId: string,
  opts: { days?: number; type?: string; limit?: number } = {},
): Promise<Slot[]> {
  const days = opts.days ?? 21
  const limit = opts.limit ?? 40
  const now = new Date()

  const rules = await db
    .select()
    .from(availabilityRule)
    .where(
      and(
        eq(availabilityRule.doctorId, doctorId),
        eq(availabilityRule.active, true),
        ...(opts.type ? [eq(availabilityRule.type, opts.type as never)] : []),
      ),
    )
  if (rules.length === 0) return []

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

  const slots: Slot[] = []
  for (let d = 0; d < days && slots.length < limit; d++) {
    const day = new Date(now)
    day.setDate(now.getDate() + d)
    const dow = day.getDay() // 0=Sun..6=Sat
    const dayRules = rules.filter((r) => r.dayOfWeek === dow)

    for (const rule of dayRules) {
      const { h: sh, m: sm } = parseTime(rule.startTime)
      const { h: eh, m: em } = parseTime(rule.endTime)
      const start = new Date(day)
      start.setHours(sh, sm, 0, 0)
      const end = new Date(day)
      end.setHours(eh, em, 0, 0)

      for (
        let t = new Date(start);
        t.getTime() + rule.slotMinutes * 60000 <= end.getTime();
        t = new Date(t.getTime() + rule.slotMinutes * 60000)
      ) {
        if (t.getTime() < now.getTime() + MIN_LEAD_MS) continue
        if (takenSet.has(t.getTime())) continue
        const endsAt = new Date(t.getTime() + rule.slotMinutes * 60000)
        slots.push({
          startsAt: t.toISOString(),
          endsAt: endsAt.toISOString(),
          label: formatSlot(t),
        })
        if (slots.length >= limit) break
      }
      if (slots.length >= limit) break
    }
  }

  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return slots
}

export async function isSlotAvailable(
  doctorId: string,
  startsAtIso: string,
  type?: string,
): Promise<boolean> {
  const slots = await getAvailableSlots(doctorId, { type, limit: 500 })
  return slots.some((s) => s.startsAt === startsAtIso)
}

function formatSlot(d: Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}
