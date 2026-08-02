import { describe, it, expect } from "vitest"
import {
  ROLES,
  PERMISSIONS,
  computePermissions,
  rolesHavePermission,
} from "@/lib/rbac"

describe("RBAC permission model", () => {
  it("a patient cannot approve providers or read arbitrary cases", () => {
    expect(
      rolesHavePermission([ROLES.PATIENT], PERMISSIONS.PROVIDER_APPROVE),
    ).toBe(false)
    expect(rolesHavePermission([ROLES.PATIENT], PERMISSIONS.CASE_READ_ANY)).toBe(
      false,
    )
    expect(rolesHavePermission([ROLES.PATIENT], PERMISSIONS.ADMIN_ACCESS)).toBe(
      false,
    )
  })

  it("a patient can apply, create a case, upload, consent, book, pay", () => {
    for (const p of [
      PERMISSIONS.PROVIDER_APPLY,
      PERMISSIONS.CASE_CREATE,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.CONSENT_GRANT,
      PERMISSIONS.APPOINTMENT_BOOK,
      PERMISSIONS.PAYMENT_CREATE,
    ]) {
      expect(rolesHavePermission([ROLES.PATIENT], p)).toBe(true)
    }
  })

  it("super admin has every permission (wildcard)", () => {
    const all = Object.values(PERMISSIONS)
    const perms = computePermissions([ROLES.SUPER_ADMIN])
    for (const p of all) expect(perms.has(p)).toBe(true)
    expect(
      rolesHavePermission([ROLES.SUPER_ADMIN], PERMISSIONS.PROVIDER_APPROVE),
    ).toBe(true)
  })

  it("compliance reviewer can approve providers but cannot book consultations", () => {
    expect(
      rolesHavePermission([ROLES.COMPLIANCE_REVIEWER], PERMISSIONS.PROVIDER_APPROVE),
    ).toBe(true)
    expect(
      rolesHavePermission([ROLES.COMPLIANCE_REVIEWER], PERMISSIONS.APPOINTMENT_BOOK),
    ).toBe(false)
  })

  it("a doctor can confirm appointments but cannot approve providers", () => {
    expect(
      rolesHavePermission([ROLES.DOCTOR], PERMISSIONS.APPOINTMENT_CONFIRM),
    ).toBe(true)
    expect(
      rolesHavePermission([ROLES.DOCTOR], PERMISSIONS.PROVIDER_APPROVE),
    ).toBe(false)
  })

  it("separates DOCTOR (medical) from CENTER (operational) care steps", () => {
    // Doctor: medical approval yes; center procedure steps no
    expect(rolesHavePermission([ROLES.DOCTOR], PERMISSIONS.MEDICAL_APPROVE)).toBe(true)
    expect(rolesHavePermission([ROLES.DOCTOR], PERMISSIONS.PROCEDURE_CONFIRM)).toBe(false)
    expect(rolesHavePermission([ROLES.DOCTOR], PERMISSIONS.PROCEDURE_COMPLETE)).toBe(false)
    // Center owner: procedure steps yes; medical approval no
    expect(rolesHavePermission([ROLES.CENTER_OWNER], PERMISSIONS.PROCEDURE_CONFIRM)).toBe(true)
    expect(rolesHavePermission([ROLES.CENTER_OWNER], PERMISSIONS.PROCEDURE_COMPLETE)).toBe(true)
    expect(rolesHavePermission([ROLES.CENTER_OWNER], PERMISSIONS.MEDICAL_APPROVE)).toBe(false)
    // Concierge: coordinates only — no medical approval, no quote pricing
    expect(rolesHavePermission([ROLES.CONCIERGE], PERMISSIONS.MEDICAL_APPROVE)).toBe(false)
    expect(rolesHavePermission([ROLES.CONCIERGE], PERMISSIONS.QUOTE_WRITE)).toBe(false)
    expect(rolesHavePermission([ROLES.CONCIERGE], PERMISSIONS.PROCEDURE_CONFIRM)).toBe(false)
  })

  it("only support agents (and super admin) can manage contact messages and support tickets", () => {
    expect(rolesHavePermission([ROLES.SUPPORT_AGENT], PERMISSIONS.SUPPORT_MANAGE)).toBe(true)
    expect(rolesHavePermission([ROLES.PATIENT], PERMISSIONS.SUPPORT_MANAGE)).toBe(false)
    expect(rolesHavePermission([ROLES.DOCTOR], PERMISSIONS.SUPPORT_MANAGE)).toBe(false)
    expect(rolesHavePermission([ROLES.CENTER_OWNER], PERMISSIONS.SUPPORT_MANAGE)).toBe(false)
    expect(rolesHavePermission([ROLES.CONCIERGE], PERMISSIONS.SUPPORT_MANAGE)).toBe(false)
    expect(rolesHavePermission([ROLES.COMPLIANCE_REVIEWER], PERMISSIONS.SUPPORT_MANAGE)).toBe(false)
    expect(rolesHavePermission([ROLES.FINANCE_ADMIN], PERMISSIONS.SUPPORT_MANAGE)).toBe(false)
  })

  it("only super admin can send a mass broadcast — every other role, including support/compliance/finance, is denied", () => {
    expect(rolesHavePermission([ROLES.SUPER_ADMIN], PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(true)
    for (const r of [
      ROLES.PATIENT,
      ROLES.DOCTOR,
      ROLES.CENTER_OWNER,
      ROLES.CENTER_ADMIN,
      ROLES.CENTER_STAFF,
      ROLES.CONCIERGE,
      ROLES.COMPLIANCE_REVIEWER,
      ROLES.FINANCE_ADMIN,
      ROLES.SUPPORT_AGENT,
      ROLES.CONTENT_ADMIN,
    ]) {
      expect(rolesHavePermission([r], PERMISSIONS.NOTIFICATIONS_BROADCAST)).toBe(false)
    }
  })
})
