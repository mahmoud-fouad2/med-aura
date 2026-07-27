import { describe, it, expect } from "vitest"
import { escapeHtml, textToSafeHtml } from "@/lib/html"

describe("escapeHtml", () => {
  it("escapes angle brackets so tags can't be injected", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;")
  })

  it("escapes ampersands, quotes, and apostrophes", () => {
    expect(escapeHtml(`Tom & "Jerry's" place`)).toBe("Tom &amp; &quot;Jerry&#39;s&quot; place")
  })

  it("leaves plain text untouched", () => {
    expect(escapeHtml("مرحبًا، هذا رد عادي.")).toBe("مرحبًا، هذا رد عادي.")
  })
})

describe("textToSafeHtml", () => {
  it("converts newlines to <br> after escaping", () => {
    expect(textToSafeHtml("line one\nline two")).toBe("line one<br>line two")
  })

  it("escapes HTML even across multiple lines", () => {
    expect(textToSafeHtml("<b>bold</b>\n<i>italic</i>")).toBe("&lt;b&gt;bold&lt;/b&gt;<br>&lt;i&gt;italic&lt;/i&gt;")
  })
})
