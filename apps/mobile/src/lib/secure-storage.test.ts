import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetItem = vi.fn<(key: string) => string>()
const mockSetItem = vi.fn<(key: string, value: string) => void>()
const mockGetItemAsync = vi.fn<(key: string) => Promise<string | null>>()
const mockSetItemAsync = vi.fn<(key: string, value: string) => Promise<void>>()
const mockDeleteItemAsync = vi.fn<(key: string) => Promise<void>>()

vi.mock("expo-secure-store", () => ({
  // The sync getItem/setItem are intentionally NOT mocked to return
  // anything usable — safeSecureStore must never call them at all (that's
  // the whole point of this design; see the module doc comment). If a test
  // below ever calls through to these, it fails loudly instead of silently
  // "passing" via the old, crash-prone sync path.
  getItem: (key: string) => mockGetItem(key),
  setItem: (key: string, value: string) => mockSetItem(key, value),
  getItemAsync: (key: string) => mockGetItemAsync(key),
  setItemAsync: (key: string, value: string) => mockSetItemAsync(key, value),
  deleteItemAsync: (key: string) => mockDeleteItemAsync(key),
}))

// Imported after the mock so the module under test binds to the fakes above,
// never the real native module (which can't load outside a device/RN runtime).
const { safeSecureStore, warmSecureStore } = await import("./secure-storage")

describe("safeSecureStore + warmSecureStore", () => {
  beforeEach(() => {
    mockGetItem.mockReset()
    mockSetItem.mockReset()
    mockGetItemAsync.mockReset()
    mockSetItemAsync.mockReset().mockResolvedValue(undefined)
    mockDeleteItemAsync.mockReset().mockResolvedValue(undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  it("getItem returns null for a never-warmed key, without touching the sync native API", () => {
    expect(safeSecureStore.getItem("never-warmed")).toBeNull()
    expect(mockGetItem).not.toHaveBeenCalled()
  })

  it("warmSecureStore populates the buffer from the async API, and getItem reads it back", async () => {
    mockGetItemAsync.mockResolvedValue("stored-value")
    await warmSecureStore(["k1"])
    expect(safeSecureStore.getItem("k1")).toBe("stored-value")
    expect(mockGetItem).not.toHaveBeenCalled()
  })

  it("a key that fails to read async is dropped (not crashed on) and cleaned up", async () => {
    mockGetItemAsync.mockRejectedValue(new Error("Keystore key permanently invalidated"))
    await expect(warmSecureStore(["bad-key"])).resolves.toBeUndefined()
    expect(safeSecureStore.getItem("bad-key")).toBeNull()
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("bad-key")
  })

  it("a missing key (fresh install) just stays empty, no error", async () => {
    mockGetItemAsync.mockResolvedValue(null)
    await warmSecureStore(["fresh-key"])
    expect(safeSecureStore.getItem("fresh-key")).toBeNull()
    expect(mockDeleteItemAsync).not.toHaveBeenCalled()
  })

  it("setItem writes to the buffer synchronously and mirrors to native async, without the sync API", () => {
    safeSecureStore.setItem("k2", "v2")
    // Immediately readable — better-auth's own onSuccess hook reads right
    // after writing, with no await in between.
    expect(safeSecureStore.getItem("k2")).toBe("v2")
    expect(mockSetItemAsync).toHaveBeenCalledWith("k2", "v2")
    expect(mockSetItem).not.toHaveBeenCalled()
  })

  it("setItem never throws even when the background native write rejects", async () => {
    mockSetItemAsync.mockRejectedValue(new Error("value too large for Keychain"))
    expect(() => safeSecureStore.setItem("k3", "v3")).not.toThrow()
    // The buffer write already happened synchronously regardless.
    expect(safeSecureStore.getItem("k3")).toBe("v3")
  })
})
