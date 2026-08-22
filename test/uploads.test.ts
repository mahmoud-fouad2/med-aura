import { describe, it, expect } from "vitest"
import {
  validateUpload,
  MAX_FILE_BYTES,
  isAllowedMime,
  validateEntityImage,
  MAX_IMAGE_BYTES,
  hasValidFileSignature,
} from "@/lib/uploads"

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

  it("rejects an extension that contradicts the declared MIME type", () => {
    expect(
      validateUpload({ contentType: "application/pdf", sizeBytes: 1000, fileName: "report.jpg" }).ok,
    ).toBe(false)
  })

  it("validates actual JPEG, PNG, WebP and PDF signatures", () => {
    expect(hasValidFileSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(true)
    expect(
      hasValidFileSignature(
        "image/png",
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(true)
    expect(hasValidFileSignature("image/webp", new TextEncoder().encode("RIFFxxxxWEBP"))).toBe(true)
    expect(hasValidFileSignature("application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true)
    expect(hasValidFileSignature("application/pdf", new TextEncoder().encode("<script>"))).toBe(false)
  })
})

describe("entity image validation (procedure/doctor/center photos)", () => {
  it("accepts an in-size JPEG/PNG/WebP", () => {
    expect(validateEntityImage({ contentType: "image/jpeg", sizeBytes: 500_000 }).ok).toBe(true)
    expect(validateEntityImage({ contentType: "image/png", sizeBytes: 500_000 }).ok).toBe(true)
    expect(validateEntityImage({ contentType: "image/webp", sizeBytes: 500_000 }).ok).toBe(true)
  })

  it("rejects PDFs — this endpoint is images-only, unlike medical document uploads", () => {
    const r = validateEntityImage({ contentType: "application/pdf", sizeBytes: 1000 })
    expect(r.ok).toBe(false)
  })

  it("rejects a file over the 8MB cap even though it's under the 15MB document cap", () => {
    const r = validateEntityImage({ contentType: "image/jpeg", sizeBytes: MAX_IMAGE_BYTES + 1 })
    expect(r.ok).toBe(false)
  })

  it("rejects empty files", () => {
    expect(validateEntityImage({ contentType: "image/jpeg", sizeBytes: 0 }).ok).toBe(false)
  })
})
