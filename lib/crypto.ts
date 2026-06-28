import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto"
import { env } from "./env"
import { logger } from "./logger"

/**
 * AES-256-GCM encryption for sensitive fields at rest (e.g. license numbers).
 * Format: base64( iv[12] | authTag[16] | ciphertext ).
 *
 * Key comes from ENCRYPTION_KEY. In development without a key we derive a
 * deterministic dev key and warn loudly — NEVER acceptable for production,
 * where a missing key throws.
 */
function getKey(): Buffer {
  const raw = env.ENCRYPTION_KEY
  if (raw && raw.length >= 32) {
    // accept hex (64 chars) or any >=32 char secret (hashed to 32 bytes)
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex")
    return createHash("sha256").update(raw).digest()
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY is required in production.")
  }
  logger.warn(
    "ENCRYPTION_KEY not set — using an insecure development key. Set it before production.",
  )
  return createHash("sha256").update("med-aura-dev-insecure-key").digest()
}

export function encryptString(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

export function decryptString(payload: string): string {
  const buf = Buffer.from(payload, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8")
}

export const last4 = (s: string) => s.slice(-4)
