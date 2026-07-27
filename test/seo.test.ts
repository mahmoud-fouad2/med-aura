import { describe, it, expect } from "vitest"
import { faqPageJsonLd, buildPageMetadata } from "@/lib/seo"

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
  it("only claims x-default — no false ar/en distinct-URL signal", () => {
    const meta = buildPageMetadata({ title: "t", description: "d", path: "/faq" })
    expect(meta.alternates?.languages).toEqual({ "x-default": expect.stringContaining("/faq") })
  })
})
