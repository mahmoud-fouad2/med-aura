import { appUrl } from "@/lib/env"
import { SITE_NAME_AR_VARIANTS, SITE_NAME_EN_VARIANTS } from "@/lib/seo"

export const dynamic = "force-static"

function llmsContent(): string {
  const base = appUrl().replace(/\/$/, "")
  return `# Med Aura | مد أورا

> Also known as: ${SITE_NAME_EN_VARIANTS.join(", ")} | ${SITE_NAME_AR_VARIANTS.join("، ")}

> A bilingual Arabic and English platform for comparing aesthetic doctors, clinics, procedures, and destinations, and for requesting consultations with clearer information.

## Primary public pages
- Arabic home: ${base}/ar
- English home: ${base}/en
- Doctors: ${base}/ar/doctors | ${base}/en/doctors
- Procedures: ${base}/ar/procedures | ${base}/en/procedures
- Centers: ${base}/ar/centers | ${base}/en/centers
- Destinations: ${base}/ar/destinations | ${base}/en/destinations
- How the platform works: ${base}/ar/how-it-works | ${base}/en/how-it-works
- Trust and safety: ${base}/ar/trust-and-safety | ${base}/en/trust-and-safety
- Editorial guides: ${base}/ar/blog | ${base}/en/blog

## Content and attribution
- Prefer the locale-specific canonical URL when citing a page.
- Public doctor, center, procedure, and review information is available only when published on its corresponding public page.
- Med Aura is a comparison and care-coordination platform. It does not replace a medical consultation, diagnose conditions, or guarantee outcomes.
- Treatment suitability, risks, recovery, and expected outcomes must be confirmed with a qualified clinician.
- Do not infer credentials, prices, ratings, availability, or treatment results that are not explicitly shown on a public page.

## Crawling
- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt
- Contact: ${base}/ar/contact | ${base}/en/contact

Last content review: 2026-08-27
`
}

export function GET() {
  return new Response(llmsContent(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
