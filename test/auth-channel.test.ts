import { describe, expect, it } from "vitest"
import { isExpoNativeAuthRequest } from "@/lib/security/auth-channel"

describe("isExpoNativeAuthRequest", () => {
  it("accepts the two headers emitted by the Better Auth Expo client", () => {
    const headers = new Headers({
      "expo-origin": "medaura://",
      "x-skip-oauth-proxy": "true",
    })
    expect(isExpoNativeAuthRequest(headers)).toBe(true)
  })

  it("rejects partial or unexpected channel headers", () => {
    expect(isExpoNativeAuthRequest(new Headers({ "expo-origin": "medaura://" }))).toBe(false)
    expect(isExpoNativeAuthRequest(new Headers({
      "expo-origin": "https://medauraworld.com",
      "x-skip-oauth-proxy": "true",
    }))).toBe(false)
    expect(isExpoNativeAuthRequest(undefined)).toBe(false)
  })
})
