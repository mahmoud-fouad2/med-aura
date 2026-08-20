import { describe, it, expect } from "vitest"
import { faqPageJsonLd, buildPageMetadata, jsonLdScript } from "@/lib/seo"

describe("faqPageJsonLd", () => {
  it("maps question/answer pairs into schema.org Question/Answer nodes", () => {
    const jsonLd = faqPageJsonLd([
      { question: "هل الاستشارة مجانية؟", answer: "الاستشارة الأولى مجانية." },
      { question: "كيف أختار طبيبًا؟", answer: "يمكنك التصفية حسب الإجراء والمدينة." },
    ])
    expect(jsonLd["@type"]).toBe("FAQPage")
    expect(jsonLd.mainEntity).toHaveLength(2)
    expect(jsonLd.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "هل الاستشارة مجانية؟",
      acceptedAnswer: { "@type": "Answer", text: "الاستشارة الأولى مجانية." },
    })
  })

  it("returns an empty mainEntity for no items rather than throwing", () => {
    expect(faqPageJsonLd([]).mainEntity).toEqual([])
  })
})

describe("buildPageMetadata", () => {
  it("publishes real Arabic and English route alternates", () => {
    const meta = buildPageMetadata({ title: "t", description: "d", path: "/faq" })
    expect(meta.alternates?.languages).toEqual({
      ar: expect.stringContaining("/ar/faq"),
      en: expect.stringContaining("/en/faq"),
      "x-default": expect.stringContaining("/faq"),
    })
  })
})

describe("jsonLdScript", () => {
  it("neutralizes a </script> sequence inside admin-editable text (FAQ answers, bios)", () => {
    const evil = 'nice answer</script><script>alert(document.cookie)</script>'
    const out = jsonLdScript({ text: evil })
    expect(out).not.toContain("</script>")
    // Still valid, byte-identical-when-parsed JSON — < parses to "<".
    expect(JSON.parse(out)).toEqual({ text: evil })
  })

  it("produces plain JSON.stringify output for text with no angle brackets", () => {
    expect(jsonLdScript({ a: 1, b: "hello" })).toBe(JSON.stringify({ a: 1, b: "hello" }))
  })
})
