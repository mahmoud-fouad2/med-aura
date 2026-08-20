import { describe, expect, it } from "vitest"
import {
  ApiError,
  NetworkError,
  TimeoutError,
  isApiErrorStatus,
  localizedApiError,
} from "./request-errors"

const copy = {
  fallback: "fallback",
  offline: "offline",
  timeout: "timeout",
  validation: "validation",
  conflict: "conflict",
  rateLimited: "rate-limited",
}

describe("localizedApiError", () => {
  it("does not mislabel a timeout as offline", () => {
    expect(localizedApiError(new TimeoutError(), "en", copy)).toBe("timeout")
    expect(localizedApiError(new NetworkError(), "en", copy)).toBe("offline")
  })

  it("uses machine codes for English and safe server copy for Arabic", () => {
    const error = new ApiError("رقم الهاتف غير صالح", 422, "VALIDATION")
    expect(localizedApiError(error, "en", copy)).toBe("validation")
    expect(localizedApiError(error, "ar", copy)).toBe("رقم الهاتف غير صالح")
  })

  it("checks status without matching translated text", () => {
    expect(isApiErrorStatus(new ApiError("not found", 404), 404)).toBe(true)
    expect(isApiErrorStatus(new Error("not found"), 404)).toBe(false)
  })
})
