/** Shared upload constraints for private medical documents (section 17). */

export const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB

export const ALLOWED_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "application/pdf": [".pdf"],
}

export function isAllowedMime(mime: string): boolean {
  return Object.keys(ALLOWED_MIME).includes(mime)
}

export function validateUpload(input: {
  contentType: string
  sizeBytes: number
  fileName?: string
}): { ok: true } | { ok: false; reason: string } {
  if (!isAllowedMime(input.contentType)) {
    return { ok: false, reason: "نوع الملف غير مسموح. ارفع صورة (JPG/PNG/WebP) أو PDF." }
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, reason: "حجم الملف يتجاوز الحد المسموح (15 ميجابايت)." }
  }
  if (input.fileName) {
    const normalized = input.fileName.toLowerCase()
    if (!ALLOWED_MIME[input.contentType].some((extension) => normalized.endsWith(extension))) {
      return { ok: false, reason: "امتداد الملف لا يطابق نوعه." }
    }
  }
  return { ok: true }
}

/** Validate the file's bytes, not the untrusted browser MIME header. */
export function hasValidFileSignature(contentType: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end))

  switch (contentType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case "image/png":
      return (
        bytes.length >= 8 &&
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
          (value, index) => bytes[index] === value,
        )
      )
    case "image/webp":
      return bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
    case "image/heic": {
      if (bytes.length < 12 || ascii(4, 8) !== "ftyp") return false
      return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(ascii(8, 12))
    }
    case "application/pdf":
      return bytes.length >= 5 && ascii(0, 5) === "%PDF-"
    default:
      return false
  }
}

/** Public entity photos (procedures, doctors, centers) — images only, smaller cap than private documents. */
export const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export function validateEntityImage(input: {
  contentType: string
  sizeBytes: number
}): { ok: true } | { ok: false; reason: string } {
  if (!IMAGE_MIME.has(input.contentType)) {
    return { ok: false, reason: "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP." }
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "حجم الصورة يتجاوز الحد المسموح (8 ميجابايت)." }
  }
  return { ok: true }
}
