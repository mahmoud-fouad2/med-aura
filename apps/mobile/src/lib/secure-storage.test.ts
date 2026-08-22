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

// These tests cover the native SecureStore path. Loading the real adapter
// would import React Native into Vitest's Node runtime, which has no native
// platform bridge and is unrelated to the buffer behavior under test.
vi.mock("./platform-storage", () => ({ browserStorage: () => null }))

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

  it("setItem writes to the buffer synchronously and exposes the native write promise", async () => {
    const persisted = safeSecureStore.setItem("k2", "v2")
    // Immediately readable — better-auth's own onSuccess hook reads right
    // after writing, with no await in between.
    expect(safeSecureStore.getItem("k2")).toBe("v2")
    expect(mockSetItemAsync).toHaveBeenCalledWith("k2", "v2")
    expect(mockSetItem).not.toHaveBeenCalled()
    await expect(persisted).resolves.toBeUndefined()
  })

  it("setItem rejects safely when persistence fails while keeping the in-memory value", async () => {
    mockSetItemAsync.mockRejectedValue(new Error("value too large for Keychain"))
    const persisted = safeSecureStore.setItem("k3", "v3")
    // The buffer write already happened synchronously regardless.
    expect(safeSecureStore.getItem("k3")).toBe("v3")
    await expect(persisted).rejects.toThrow("value too large")
  })

  it("warms every persisted Better Auth chunk before the sync adapter reads it", async () => {
    mockGetItemAsync.mockImplementation(async (key) => {
      if (key === "chunked") return "\u0001ba-chunks:2"
      if (key === "chunked.0") return "first-"
      if (key === "chunked.1") return "second"
      return null
    })

    await warmSecureStore(["chunked"])

    expect(safeSecureStore.getItem("chunked")).toBe("\u0001ba-chunks:2")
    expect(safeSecureStore.getItem("chunked.0")).toBe("first-")
    expect(safeSecureStore.getItem("chunked.1")).toBe("second")
  })
})
