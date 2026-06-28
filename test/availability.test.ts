import { describe, it, expect } from "vitest"
import { generateSlots, MIN_LEAD_MS, type RuleLite } from "@/lib/data/availability"

function at(now: Date, addDays: number, h: number, m: number): number {
  const d = new Date(now)
  d.setDate(now.getDate() + addDays)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

describe("availability slot generation", () => {
  const now = new Date("2026-07-01T08:00:00")
  const tomorrowDow = (now.getDay() + 1) % 7
  const rule: RuleLite = {
    dayOfWeek: tomorrowDow,
    startTime: "10:00",
    endTime: "12:00",
    slotMinutes: 30,
  }

  it("generates one slot per interval within the window", () => {
    const slots = generateSlots([rule], new Set(), { now, days: 7, limit: 40 })
    // 10:00, 10:30, 11:00, 11:30 => 4 slots
    expect(slots.length).toBe(4)
  })

  it("excludes already-booked slots", () => {
    const taken = new Set([at(now, 1, 10, 30)])
    const slots = generateSlots([rule], taken, { now, days: 7, limit: 40 })
    expect(slots.length).toBe(3)
    const takenIso = new Date(at(now, 1, 10, 30)).toISOString()
    expect(slots.some((s) => s.startsAt === takenIso)).toBe(false)
  })

  it("respects the booking lead time for same-day slots", () => {
    // a rule for *today* starting soon should be filtered by MIN_LEAD_MS
    const todayRule: RuleLite = {
      dayOfWeek: now.getDay(),
      startTime: "08:30", // 30 min after now (< 1h lead)
      endTime: "09:00",
      slotMinutes: 30,
    }
    const slots = generateSlots([todayRule], new Set(), { now, days: 1, limit: 40 })
    expect(slots.length).toBe(0)
    expect(MIN_LEAD_MS).toBe(60 * 60 * 1000)
  })

  it("honors the limit", () => {
    const slots = generateSlots([rule], new Set(), { now, days: 28, limit: 2 })
    expect(slots.length).toBe(2)
  })
})
