import { describe, it, expect } from "vitest"
import { fromZonedTime } from "date-fns-tz"
import { generateSlots, MIN_LEAD_MS, type RuleLite } from "@/lib/data/availability"

function at(now: Date, addDays: number, h: number, m: number): number {
  const localDate = new Date(Date.UTC(2026, 6, 1 + addDays)).toISOString().slice(0, 10)
  return fromZonedTime(
    `${localDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
    "Asia/Riyadh",
  ).getTime()
}

describe("availability slot generation", () => {
  const now = new Date("2026-07-01T05:00:00.000Z") // 08:00 in Riyadh
  const tomorrowDow = 4
  const rule: RuleLite = {
    dayOfWeek: tomorrowDow,
    startTime: "10:00",
    endTime: "12:00",
    slotMinutes: 30,
  }

  it("generates one slot per interval within the window", () => {
    const slots = generateSlots([rule], new Set(), {
      now,
      days: 7,
      limit: 40,
      timeZone: "Asia/Riyadh",
    })
    // 10:00, 10:30, 11:00, 11:30 => 4 slots
    expect(slots.length).toBe(4)
  })

  it("excludes already-booked slots", () => {
    const taken = new Set([at(now, 1, 10, 30)])
    const slots = generateSlots([rule], taken, {
      now,
      days: 7,
      limit: 40,
      timeZone: "Asia/Riyadh",
    })
    expect(slots.length).toBe(3)
    const takenIso = new Date(at(now, 1, 10, 30)).toISOString()
    expect(slots.some((s) => s.startsAt === takenIso)).toBe(false)
  })

  it("respects the booking lead time for same-day slots", () => {
    // a rule for *today* starting soon should be filtered by MIN_LEAD_MS
    const todayRule: RuleLite = {
      dayOfWeek: 3,
      startTime: "08:30", // 30 min after now (< 1h lead)
      endTime: "09:00",
      slotMinutes: 30,
    }
    const slots = generateSlots([todayRule], new Set(), {
      now,
      days: 1,
      limit: 40,
      timeZone: "Asia/Riyadh",
    })
    expect(slots.length).toBe(0)
    expect(MIN_LEAD_MS).toBe(60 * 60 * 1000)
  })

  it("honors the limit", () => {
    const slots = generateSlots([rule], new Set(), {
      now,
      days: 28,
      limit: 2,
      timeZone: "Asia/Riyadh",
    })
    expect(slots.length).toBe(2)
  })

  it("uses the provider timezone instead of the server timezone", () => {
    const turkeyRule: RuleLite = {
      dayOfWeek: 3,
      startTime: "10:00",
      endTime: "10:30",
      slotMinutes: 30,
    }
    const slots = generateSlots([turkeyRule], new Set(), {
      now: new Date("2026-07-01T05:00:00.000Z"),
      days: 1,
      limit: 10,
      timeZone: "Europe/Istanbul",
    })
    expect(slots[0]?.startsAt).toBe("2026-07-01T07:00:00.000Z")
  })
})
