import { describe, it, expect } from "vitest"
import { validateUpload, MAX_FILE_BYTES, isAllowedMime } from "@/lib/uploads"

describe("upload validation", () => {
  it("accepts an in-size image", () => {
    expect(validateUpload({ contentType: "image/jpeg", sizeBytes: 1_000_000 }).ok).toBe(
      true,
    )
  })

  it("rejects disallowed mime types", () => {
    expect(isAllowedMime("application/x-msdownload")).toBe(false)
    const r = validateUpload({
      contentType: "application/x-msdownload",
      sizeBytes: 1000,
    })
    expect(r.ok).toBe(false)
  })

  it("rejects oversized files", () => {
    const r = validateUpload({
      contentType: "image/png",
      sizeBytes: MAX_FILE_BYTES + 1,
    })
    expect(r.ok).toBe(false)
  })

  it("rejects empty files", () => {
    expect(validateUpload({ contentType: "image/png", sizeBytes: 0 }).ok).toBe(false)
  })
})
