import { describe, it, expect } from "vitest"
import { resolveNativeNotificationRoute } from "./notification-routes"

describe("resolveNativeNotificationRoute", () => {
  it("maps a case href to the native case screen", () => {
    expect(resolveNativeNotificationRoute("/dashboard/cases/abc123")).toBe("/case/abc123")
  })

  it("strips a trailing query string from the case id", () => {
    expect(resolveNativeNotificationRoute("/dashboard/cases/abc123?tab=safety")).toBe("/case/abc123")
  })

  it("maps the appointments href to the native tab", () => {
    expect(resolveNativeNotificationRoute("/dashboard/appointments")).toBe("/(tabs)/appointments")
  })

  it("maps a support ticket href to the native ticket thread", () => {
    expect(resolveNativeNotificationRoute("/dashboard/support/ticket-1")).toBe("/support/ticket-1")
  })

  it("strips a trailing query string from the ticket id", () => {
    expect(resolveNativeNotificationRoute("/dashboard/support/ticket-1?foo=bar")).toBe("/support/ticket-1")
  })

  it("returns null for hrefs with no native screen (falls back to the browser)", () => {
    expect(resolveNativeNotificationRoute("/dashboard/doctor")).toBeNull()
    expect(resolveNativeNotificationRoute("/dashboard/center")).toBeNull()
    expect(resolveNativeNotificationRoute("/dashboard")).toBeNull()
    // Staff triage link — admin ticket tooling stays web-only by design.
    expect(resolveNativeNotificationRoute("/admin/tickets?open=ticket-1")).toBeNull()
  })

  it("returns null for missing hrefs", () => {
    expect(resolveNativeNotificationRoute(null)).toBeNull()
    expect(resolveNativeNotificationRoute(undefined)).toBeNull()
    expect(resolveNativeNotificationRoute("")).toBeNull()
  })
})
