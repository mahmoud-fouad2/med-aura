import { describe, expect, it } from "vitest"
import {
  canCancelAppointment,
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

  it("allows cancelling upcoming appointments in valid statuses", () => {
    const futureStartsAt = new Date("2026-08-09T13:00:00.000Z")
    const pastStartsAt = new Date("2026-08-09T11:00:00.000Z")

    for (const status of ["CONFIRMED", "RESCHEDULED", "PENDING_PAYMENT", "PENDING_PROVIDER_CONFIRMATION"]) {
      expect(canCancelAppointment({ status, startsAt: futureStartsAt, now })).toBe(true)
      expect(canCancelAppointment({ status, startsAt: pastStartsAt, now })).toBe(false)
    }

    for (const status of ["COMPLETED", "NO_SHOW", "CANCELLED_BY_PATIENT", "CANCELLED_BY_PROVIDER"]) {
      expect(canCancelAppointment({ status, startsAt: futureStartsAt, now })).toBe(false)
    }
  })
})