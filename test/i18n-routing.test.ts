import { describe, expect, it } from "vitest"
import { localizedPath } from "@/lib/i18n/config"

describe("localizedPath", () => {
  it("prefixes unlocalized paths", () => {
    expect(localizedPath("/procedures", "en")).toBe("/en/procedures")
    expect(localizedPath("/", "ar")).toBe("/ar")
  })

  it("replaces an existing locale instead of duplicating it", () => {
    expect(localizedPath("/ar/search?q=face", "en")).toBe("/en/search?q=face")
  })
})
