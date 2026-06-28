import { describe, it, expect } from "vitest"
import { encryptString, decryptString, last4 } from "@/lib/crypto"

describe("field encryption (AES-256-GCM)", () => {
  it("round-trips a value", () => {
    const plain = "SA-PLS-44821"
    const enc = encryptString(plain)
    expect(enc).not.toBe(plain)
    expect(decryptString(enc)).toBe(plain)
  })

  it("produces different ciphertext each time (random IV)", () => {
    expect(encryptString("same")).not.toBe(encryptString("same"))
  })

  it("last4 returns the trailing characters", () => {
    expect(last4("SA-PLS-44821")).toBe("4821")
  })
})
