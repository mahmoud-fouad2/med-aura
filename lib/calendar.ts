/**
 * Calendar Event Utilities for Med Aura.
 *
 * Generates direct Google Calendar URLs, Outlook Web URLs, and RFC 5545
 * standard iCalendar (.ics) content so patients and doctors can add their
 * consultations and appointments to their personal calendars with one tap.
 */

export type CalendarEvent = {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime?: Date
  url?: string
}

function formatDateToIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

/**
 * Generates a direct Google Calendar web link.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = formatDateToIcs(event.startTime)
  const end = formatDateToIcs(
    event.endTime ?? new Date(event.startTime.getTime() + 45 * 60 * 1000)
  )

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
  })

  if (event.description) params.set("details", event.description)
  if (event.location) params.set("location", event.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generates a direct Outlook.com / Office 365 web link.
 */
export function buildOutlookCalendarUrl(event: CalendarEvent): string {
  const start = event.startTime.toISOString()
  const end = (
    event.endTime ?? new Date(event.startTime.getTime() + 45 * 60 * 1000)
  ).toISOString()

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start,
    enddt: end,
  })

  if (event.description) params.set("body", event.description)
  if (event.location) params.set("location", event.location)

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generates RFC 5545 iCalendar (.ics) string for Apple Calendar and offline download.
 */
export function buildIcsContent(event: CalendarEvent): string {
  const now = formatDateToIcs(new Date())
  const start = formatDateToIcs(event.startTime)
  const end = formatDateToIcs(
    event.endTime ?? new Date(event.startTime.getTime() + 45 * 60 * 1000)
  )
  const uid = `medaura-${event.startTime.getTime()}-${Math.random().toString(36).slice(2, 9)}@medauraworld.com`

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Med Aura//Medical Tourism Platform//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title.replace(/,/g, "\\,").replace(/;/g, "\\;")}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${event.location.replace(/,/g, "\\,")}`)
  }
  if (event.url) {
    lines.push(`URL:${event.url}`)
  }

  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR")

  return lines.join("\r\n")
}
