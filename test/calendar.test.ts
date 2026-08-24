import { describe, it, expect } from "vitest"
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildIcsContent,
} from "@/lib/calendar"

describe("lib/calendar", () => {
  const event = {
    title: "استشارة تجميلية مع د. سارة أحمد",
    description: "استشارة مرئية عبر منصة Med Aura.\nرابط الاستشارة: https://medauraworld.com/video/room-123",
    location: "عيادة Med Aura الافتراضية",
    startTime: new Date("2026-09-15T10:00:00.000Z"),
    endTime: new Date("2026-09-15T10:45:00.000Z"),
    url: "https://medauraworld.com/video/room-123",
  }

  it("builds valid Google Calendar URL", () => {
    const url = buildGoogleCalendarUrl(event)
    expect(url).toContain("calendar.google.com/calendar/render")
    expect(url).toContain("action=TEMPLATE")
    expect(url).toContain("20260915T100000Z%2F20260915T104500Z")
  })

  it("builds valid Outlook Calendar URL", () => {
    const url = buildOutlookCalendarUrl(event)
    expect(url).toContain("outlook.live.com/calendar")
    expect(url).toContain("path=%2Fcalendar%2Faction%2Fcompose")
  })

  it("generates RFC 5545 compliant iCalendar (.ics) content", () => {
    const ics = buildIcsContent(event)
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("VERSION:2.0")
    expect(ics).toContain("DTSTART:20260915T100000Z")
    expect(ics).toContain("DTEND:20260915T104500Z")
    expect(ics).toContain("SUMMARY:استشارة تجميلية مع د. سارة أحمد")
    expect(ics).toContain("END:VCALENDAR")
  })
})
