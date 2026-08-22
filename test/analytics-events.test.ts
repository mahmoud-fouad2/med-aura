import { describe, expect, it } from "vitest"
import { sanitizeAnalyticsEvent } from "@/lib/analytics-events"

describe("analytics event privacy boundary", () => {
  it("accepts allowlisted events and strips unknown properties", () => {
    expect(
      sanitizeAnalyticsEvent({
        name: "booking_created",
        locale: "ar",
        path: "/doctors/example/book",
        properties: { doctorId: "doctor-1", type: "video", email: "private@example.com" },
      }),
    ).toEqual({
      name: "booking_created",
      locale: "ar",
      path: "/doctors/example/book",
      properties: { doctorId: "doctor-1", type: "video" },
    })
  })

  it("rejects unknown events and absolute URLs", () => {
    expect(sanitizeAnalyticsEvent({ name: "medical_note", properties: {} })).toBeNull()
    expect(
      sanitizeAnalyticsEvent({
        name: "page_view",
        path: "https://evil.test/private",
        properties: {},
      }),
    ).toBeNull()
  })
})
