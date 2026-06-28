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
}): { ok: true } | { ok: false; reason: string } {
  if (!isAllowedMime(input.contentType)) {
    return { ok: false, reason: "نوع الملف غير مسموح. ارفع صورة (JPG/PNG/WebP) أو PDF." }
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, reason: "حجم الملف يتجاوز الحد المسموح (15 ميجابايت)." }
  }
  return { ok: true }
}
