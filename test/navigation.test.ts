import { describe, expect, it } from "vitest"
import { safeRelativePath } from "@/lib/navigation"

describe("safeRelativePath", () => {
  it("keeps internal paths, query strings, and hashes", () => {
    expect(safeRelativePath("/en/search?category=skin#results")).toBe(
      "/en/search?category=skin#results",
    )
  })

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "/dashboard\nLocation:https://attacker.example",
  ])("rejects an unsafe destination: %s", (destination) => {
    expect(safeRelativePath(destination)).toBe("/dashboard")
  })

  it("uses the caller's fallback for empty input", () => {
    expect(safeRelativePath(undefined, "/sign-in")).toBe("/sign-in")
  })
})
