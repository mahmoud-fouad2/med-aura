import { describe, expect, it } from "vitest"
import {
  canMarkAppointmentNoShow,
  canRescheduleMissedAppointment,
} from "@/lib/domain/appointment-state"

const now = new Date("2026-08-09T12:00:00.000Z")

describe("appointment no-show transitions", () => {
  it("allows no-show only after a confirmed or rescheduled appointment ends", () => {
    expect(
      canMarkAppointmentNoShow({
        status: "CONFIRMED",
        endsAt: new Date("2026-08-09T11:59:00.000Z"),
        now,
      }),
    ).toBe(true)
    expect(
      canMarkAppointmentNoShow({
        status: "CONFIRMED",
        endsAt: new Date("2026-08-09T12:01:00.000Z"),
        now,
      }),
    ).toBe(false)
    expect(
      canMarkAppointmentNoShow({
        status: "PENDING_PAYMENT",
        endsAt: new Date("2026-08-09T11:00:00.000Z"),
        now,
      }),
    ).toBe(false)
  })

  it("allows the missed appointment to be rescheduled only from NO_SHOW", () => {
    expect(canRescheduleMissedAppointment("NO_SHOW")).toBe(true)
    expect(canRescheduleMissedAppointment("COMPLETED")).toBe(false)
    expect(canRescheduleMissedAppointment("CANCELLED_BY_PATIENT")).toBe(false)
  })
})