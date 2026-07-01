import { describe, it, expect } from "vitest"
import {
  canTransition,
  canRoleTransition,
  assertCaseTransition,
  allowedNextStates,
} from "@/lib/domain/case-state-machine"
import { ROLES } from "@/lib/rbac"

describe("case state machine", () => {
  it("allows the main care-journey chain in order", () => {
    const chain = [
      ["CONSULTATION_BOOKED", "CONSULTATION_COMPLETED"],
      ["CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED"],
      ["TREATMENT_PLAN_ISSUED", "QUOTE_ISSUED"],
      ["QUOTE_ISSUED", "QUOTE_ACCEPTED"],
      ["QUOTE_ACCEPTED", "DEPOSIT_PAID"],
      ["DEPOSIT_PAID", "MEDICALLY_APPROVED"],
      ["MEDICALLY_APPROVED", "CENTER_CONFIRMED"],
      ["CENTER_CONFIRMED", "PROCEDURE_CONFIRMED"],
      ["PROCEDURE_CONFIRMED", "PROCEDURE_COMPLETED"],
      ["PROCEDURE_COMPLETED", "FOLLOW_UP"],
      ["FOLLOW_UP", "CLOSED"],
    ] as const
    for (const [from, to] of chain) {
      expect(canTransition(from, to)).toBe(true)
    }
  })

  it("forbids skipping steps", () => {
    expect(canTransition("CONSULTATION_BOOKED", "DEPOSIT_PAID")).toBe(false)
    expect(canTransition("TREATMENT_PLAN_ISSUED", "DEPOSIT_PAID")).toBe(false)
    expect(canTransition("SUBMITTED", "PROCEDURE_CONFIRMED")).toBe(false)
    expect(canTransition("DEPOSIT_PAID", "PROCEDURE_CONFIRMED")).toBe(false)
  })

  it("assertCaseTransition throws on an illegal transition", () => {
    expect(() => assertCaseTransition("CONSULTATION_BOOKED", "DEPOSIT_PAID")).toThrow()
    expect(() => assertCaseTransition("CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED")).not.toThrow()
  })

  it("gates transitions by role", () => {
    // only a doctor completes a consultation / issues a plan
    expect(
      canRoleTransition("CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED", [ROLES.DOCTOR]),
    ).toBe(true)
    expect(
      canRoleTransition("CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED", [ROLES.PATIENT]),
    ).toBe(false)
    // deposit-paid is system-only (verified webhook), not patient-triggerable
    expect(canRoleTransition("QUOTE_ACCEPTED", "DEPOSIT_PAID", [ROLES.PATIENT])).toBe(false)
    expect(canRoleTransition("QUOTE_ACCEPTED", "DEPOSIT_PAID", ["system"])).toBe(true)
    // a center/concierge cannot medically approve
    expect(canRoleTransition("DEPOSIT_PAID", "MEDICALLY_APPROVED", [ROLES.CENTER_ADMIN])).toBe(false)
    expect(canRoleTransition("DEPOSIT_PAID", "MEDICALLY_APPROVED", [ROLES.DOCTOR])).toBe(true)
    // super admin override
    expect(canRoleTransition("DEPOSIT_PAID", "MEDICALLY_APPROVED", [ROLES.SUPER_ADMIN])).toBe(true)
  })

  it("CANCELLED is fully terminal", () => {
    expect(allowedNextStates("CANCELLED")).toHaveLength(0)
  })

  it("CLOSED only allows an authorized, role-gated reopen — not a free bypass", () => {
    expect(allowedNextStates("CLOSED")).toEqual(["FOLLOW_UP"])
    expect(canRoleTransition("CLOSED", "FOLLOW_UP", [ROLES.PATIENT])).toBe(false)
    expect(canRoleTransition("CLOSED", "FOLLOW_UP", [ROLES.DOCTOR])).toBe(false)
    expect(canRoleTransition("CLOSED", "FOLLOW_UP", [ROLES.CONCIERGE])).toBe(true)
    expect(canRoleTransition("CLOSED", "FOLLOW_UP", [ROLES.SUPER_ADMIN])).toBe(true)
  })
})
