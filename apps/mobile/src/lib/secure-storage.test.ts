import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetItem = vi.fn<(key: string) => string | null>()
const mockSetItem = vi.fn<(key: string, value: string) => void>()

vi.mock("expo-secure-store", () => ({
  getItem: (key: string) => mockGetItem(key),
  setItem: (key: string, value: string) => mockSetItem(key, value),
}))

// Imported after the mock so the module under test binds to the fakes above,
// never the real native module (which can't load outside a device/RN runtime).
const { safeSecureStore } = await import("./secure-storage")

describe("safeSecureStore", () => {
  beforeEach(() => {
    mockGetItem.mockReset()
    mockSetItem.mockReset()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("getItem returns the underlying value on success", () => {
    mockGetItem.mockReturnValue("stored-value")
    expect(safeSecureStore.getItem("k")).toBe("stored-value")
  })

  it("getItem returns null (not throw) when the native read throws", () => {
    mockGetItem.mockImplementation(() => {
      throw new Error("Keystore key permanently invalidated")
    })
    expect(() => safeSecureStore.getItem("k")).not.toThrow()
    expect(safeSecureStore.getItem("k")).toBeNull()
  })

  it("setItem writes through on success", () => {
    safeSecureStore.setItem("k", "v")
    expect(mockSetItem).toHaveBeenCalledWith("k", "v")
  })

  it("setItem swallows a throw instead of propagating it", () => {
    mockSetItem.mockImplementation(() => {
      throw new Error("value too large for Keychain")
    })
    expect(() => safeSecureStore.setItem("k", "v")).not.toThrow()
  })
})
