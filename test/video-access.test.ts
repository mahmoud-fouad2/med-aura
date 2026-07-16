import { describe, expect, it } from "vitest"
import { decideVideoAccess, denyMessage } from "@/lib/video/service"

/**
 * The video access decision is the security boundary of the whole video
 * system — every join, session and token request passes through it. These
 * tests pin the full authorization matrix and the time-window edges.
 */

const WINDOW = { beforeMinutes: 10, afterMinutes: 30 }

// A confirmed 30-minute video appointment starting "in 5 minutes".
const NOW = new Date("2026-07-16T12:00:00Z")
const APPT = {
  type: "VIDEO_CONSULTATION",
  status: "CONFIRMED",
  startsAt: new Date("2026-07-16T12:05:00Z"),
  endsAt: new Date("2026-07-16T12:35:00Z"),
}

function decide(overrides: {
  appointment?: Partial<typeof APPT> | null
  viewerRole?: "patient" | "doctor" | "staff" | null
  providerReady?: boolean
  now?: Date
}) {
  return decideVideoAccess({
    appointment:
      overrides.appointment === null
        ? null
        : { ...APPT, ...overrides.appointment },
    viewerRole:
      overrides.viewerRole === undefined ? "patient" : overrides.viewerRole,
    providerReady: overrides.providerReady ?? true,
    now: overrides.now ?? NOW,
    window: WINDOW,
  })
}

describe("video access — authorization", () => {
  it("allows the appointment's patient inside the window", () => {
    const d = decide({})
    expect(d.allowed).toBe(true)
    if (d.allowed) expect(d.role).toBe("patient")
  })

  it("allows the appointment's doctor", () => {
    const d = decide({ viewerRole: "doctor" })
    expect(d.allowed).toBe(true)
    if (d.allowed) expect(d.role).toBe("doctor")
  })

  it("allows oversight staff", () => {
    expect(decide({ viewerRole: "staff" }).allowed).toBe(true)
  })

  it("rejects a stranger — before revealing anything about the appointment", () => {
    // Even a non-video, cancelled appointment must answer identically.
    const d = decide({
      viewerRole: null,
      appointment: { type: "IN_PERSON_CONSULTATION", status: "CANCELLED_BY_PATIENT" },
    })
    expect(d).toEqual({ allowed: false, reason: "not_authorized" })
  })

  it("rejects a missing appointment", () => {
    expect(decide({ appointment: null })).toEqual({
      allowed: false,
      reason: "not_found",
    })
  })
})

describe("video access — appointment shape", () => {
  it("rejects in-person appointments", () => {
    const d = decide({ appointment: { type: "IN_PERSON_CONSULTATION" } })
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe("not_video")
  })

  it("rejects when no provider is configured — even for the owner in-window", () => {
    const d = decide({ providerReady: false })
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe("disabled")
  })

  it("rejects unconfirmed appointments", () => {
    for (const status of ["PENDING_PAYMENT", "PENDING_PROVIDER_CONFIRMATION", "RESCHEDULED"]) {
      const d = decide({ appointment: { status } })
      expect(d.allowed).toBe(false)
      if (!d.allowed) expect(d.reason).toBe("not_confirmed")
    }
  })

  it("rejects cancelled / no-show appointments", () => {
    for (const status of ["CANCELLED_BY_PATIENT", "CANCELLED_BY_PROVIDER", "NO_SHOW"]) {
      const d = decide({ appointment: { status } })
      expect(d.allowed).toBe(false)
      if (!d.allowed) expect(d.reason).toBe("cancelled")
    }
  })

  it("treats a completed appointment as expired", () => {
    const d = decide({ appointment: { status: "COMPLETED" } })
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe("expired")
  })

  it("allows checked-in and in-progress appointments", () => {
    for (const status of ["CHECKED_IN", "IN_PROGRESS"]) {
      expect(decide({ appointment: { status } }).allowed).toBe(true)
    }
  })
})

describe("video access — join window", () => {
  it("rejects exactly one minute before the window opens", () => {
    // startsAt 12:05, window opens 11:55 → 11:54 is too early.
    const d = decide({ now: new Date("2026-07-16T11:54:00Z") })
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe("too_early")
  })

  it("allows at the exact opening minute", () => {
    expect(decide({ now: new Date("2026-07-16T11:55:00Z") }).allowed).toBe(true)
  })

  it("allows during the grace period after the appointment ends", () => {
    // endsAt 12:35 + 30 min after-window → 13:00 still allowed.
    expect(decide({ now: new Date("2026-07-16T13:00:00Z") }).allowed).toBe(true)
  })

  it("rejects after the window closes", () => {
    const d = decide({ now: new Date("2026-07-16T13:06:00Z") })
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.reason).toBe("expired")
  })

  it("returns the window bounds so screens can show real times", () => {
    const d = decide({})
    expect(d.joinFrom?.toISOString()).toBe("2026-07-16T11:55:00.000Z")
    expect(d.joinUntil?.toISOString()).toBe("2026-07-16T13:05:00.000Z")
  })
})

describe("video access — humane copy", () => {
  it("never leaks technical terms", () => {
    const reasons = [
      "not_found",
      "not_authorized",
      "not_video",
      "disabled",
      "not_confirmed",
      "cancelled",
      "too_early",
      "expired",
    ] as const
    for (const reason of reasons) {
      const msg = denyMessage(reason, 10)
      expect(msg).not.toMatch(/token|room|provider|webrtc|403|500/i)
      expect(msg.length).toBeGreaterThan(10)
    }
  })

  it("hides not-authorized behind the same copy as not-found", () => {
    expect(denyMessage("not_authorized", 10)).toBe(denyMessage("not_found", 10))
  })
})
