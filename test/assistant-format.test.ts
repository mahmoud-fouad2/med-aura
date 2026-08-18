import { describe, it, expect } from "vitest"
import { sanitizeReply } from "@/lib/ai/assistant"

/**
 * The chat renders replies through a plain <Text>, so any Markdown the model
 * emits shows up as literal clutter. This is the exact text pattern seen on
 * device: bold markers, an italic disclaimer, and a numbered list.
 */
describe("sanitizeReply", () => {
  it("strips the Markdown seen in the on-device reply", () => {
    const raw = [
      "اهلا بك في **Med Aura**! يسعدني مساعدتك في العثور على الطبيب الأنسب لك.",
      "",
      "*(تنبيه: هذه المساعدة للإرشاد وتسهيل الاختيار، وليست بديلاً عن الاستشارة أو التشخيص الطبي المباشر).*",
      "",
      "1. **الإجراء أو المشكلة التجميلية** التي تود استشارة الطبيب بشأنها؟",
      "2. **المدينة**؟",
    ].join("\n")

    const out = sanitizeReply(raw)

    expect(out).not.toContain("*")
    expect(out).not.toMatch(/^\s*\d+[.)]\s/m)
    // The words themselves must survive.
    expect(out).toContain("Med Aura")
    expect(out).toContain("الإجراء أو المشكلة التجميلية")
    expect(out).toContain("المدينة")
  })

  it("removes bullets, headings, backticks and links but keeps the text", () => {
    const raw = [
      "## عنوان",
      "- نقطة أولى",
      "* نقطة ثانية",
      "> اقتباس",
      "استخدم `الكود` هنا",
      "[اضغط هنا](https://example.com)",
    ].join("\n")

    const out = sanitizeReply(raw)

    expect(out).toContain("عنوان")
    expect(out).toContain("نقطة أولى")
    expect(out).toContain("نقطة ثانية")
    expect(out).toContain("اقتباس")
    expect(out).toContain("الكود")
    expect(out).toContain("اضغط هنا")
    expect(out).not.toContain("#")
    expect(out).not.toContain("`")
    expect(out).not.toContain("https://example.com")
  })

  it("leaves already-clean Arabic prose untouched", () => {
    const clean = "اخترت لك هؤلاء الأطباء في الرياض.\nاضغط على البطاقة لعرض الملف والحجز."
    expect(sanitizeReply(clean)).toBe(clean)
  })

  it("collapses the blank-line runs stripping leaves behind", () => {
    expect(sanitizeReply("سطر\n\n\n\nسطر آخر")).toBe("سطر\n\nسطر آخر")
  })
})
