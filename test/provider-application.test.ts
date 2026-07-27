import { describe, it, expect } from "vitest"
import {
  decideApplicationDecisionEligibility,
  decideApplicationResubmitEligibility,
} from "@/lib/actions/provider-application-rules"

describe("decideApplicationDecisionEligibility", () => {
  it("denies when the application doesn't exist", () => {
    const d = decideApplicationDecisionEligibility({ application: null })
    expect(d).toEqual({ allowed: false, reason: "not_found" })
  })

  it("allows deciding a submitted application", () => {
    const d = decideApplicationDecisionEligibility({ application: { status: "SUBMITTED" } })
    expect(d).toEqual({ allowed: true })
  })

  it("allows deciding an application under review", () => {
    const d = decideApplicationDecisionEligibility({ application: { status: "UNDER_REVIEW" } })
    expect(d).toEqual({ allowed: true })
  })

  it("allows requesting changes on a needs-changes application again", () => {
    const d = decideApplicationDecisionEligibility({ application: { status: "NEEDS_CHANGES" } })
    expect(d).toEqual({ allowed: true })
  })

  it("refuses an already-approved application", () => {
    const d = decideApplicationDecisionEligibility({ application: { status: "APPROVED" } })
    expect(d).toEqual({ allowed: false, reason: "already_decided" })
  })

  it("refuses an already-rejected application", () => {
    const d = decideApplicationDecisionEligibility({ application: { status: "REJECTED" } })
    expect(d).toEqual({ allowed: false, reason: "already_decided" })
  })
})

describe("decideApplicationResubmitEligibility", () => {
  it("allows a fresh insert when no application exists yet", () => {
    const d = decideApplicationResubmitEligibility({ existing: null })
    expect(d).toEqual({ allowed: true, mode: "insert" })
  })

  it("updates the existing row when it needs changes", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "NEEDS_CHANGES" } })
    expect(d).toEqual({ allowed: true, mode: "update" })
  })

  it("blocks a second submission while still submitted", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "SUBMITTED" } })
    expect(d).toEqual({ allowed: false, reason: "already_open" })
  })

  it("blocks a second submission while under review", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "UNDER_REVIEW" } })
    expect(d).toEqual({ allowed: false, reason: "already_open" })
  })

  it("blocks a second submission left in draft", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "DRAFT" } })
    expect(d).toEqual({ allowed: false, reason: "already_open" })
  })

  it("allows a fresh application after a prior one was approved", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "APPROVED" } })
    expect(d).toEqual({ allowed: true, mode: "insert" })
  })

  it("allows a fresh application after a prior one was rejected", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "REJECTED" } })
    expect(d).toEqual({ allowed: true, mode: "insert" })
  })

  it("allows a fresh application after a prior one expired", () => {
    const d = decideApplicationResubmitEligibility({ existing: { status: "EXPIRED" } })
    expect(d).toEqual({ allowed: true, mode: "insert" })
  })
})
