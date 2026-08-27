import { describe, expect, it } from "vitest"
import { caseIdFromPrivateChannel } from "@/app/api/pusher/auth/route"

describe("caseIdFromPrivateChannel", () => {
  it("extracts only a private case channel id", () => {
    expect(caseIdFromPrivateChannel("private-case-case_123-abc")).toBe("case_123-abc")
    expect(caseIdFromPrivateChannel("case-case_123")).toBeNull()
    expect(caseIdFromPrivateChannel("private-user-123")).toBeNull()
    expect(caseIdFromPrivateChannel("private-case-../../admin")).toBeNull()
  })
})
