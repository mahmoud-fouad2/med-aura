/**
 * Client-side downscale before upload — admin entity photos (procedures,
 * doctors, centers) had no size cap beyond a flat 8MB, and nothing resized
 * them before they landed in R2. The web image optimizer re-transforms
 * from that original on every distinct size it's asked for, and the mobile
 * app fetches the very same original directly (it has no optimizer at
 * all) — a multi-megabyte original meant slow, sometimes-failing image
 * loads on both. Resizing in the browser before the presigned PUT means
 * every consumer downstream gets a reasonably sized source from the start.
 *
 * Never blocks the upload: any failure (unsupported format, canvas error)
 * falls back to the original file rather than losing the admin's edit.
 */
export const MAX_EDGE = 1600
const JPEG_QUALITY = 0.85

/**
 * Pure dimension math, split out from the canvas/File-API work below so it's
 * unit-testable without a DOM (this repo's vitest environment is "node" —
 * see vitest.config.ts). null means "already small enough, don't touch it".
 */
export function computeResizeDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } | null {
  const longestEdge = Math.max(width, height)
  if (longestEdge <= maxEdge) return null
  const scale = maxEdge / longestEdge
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function resizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file

  try {
    const bitmap = await createImageBitmap(file)
    const target = computeResizeDimensions(bitmap.width, bitmap.height)
    if (!target) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    )
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], newName, { type: "image/jpeg" })
  } catch {
    return file
  }
}
