import { SiteHeader } from "@/components/layout/site-header"
import { Hero } from "@/components/landing/hero"
import { CosmeticAreas } from "@/components/landing/cosmetic-areas"
import { PopularProcedures } from "@/components/landing/popular-procedures"
import { FeaturedDoctors } from "@/components/landing/featured-doctors"
import { FeaturedReviews } from "@/components/landing/featured-reviews"
import { TrustBand } from "@/components/landing/trust-band"
import { BeforeAfterShowcase } from "@/components/landing/before-after-showcase"
import { CtaFooter } from "@/components/landing/cta-footer"
import { FeaturedArticles } from "@/components/landing/featured-articles"
import { getI18n } from "@/lib/i18n"
import { SearchIntentContent } from "@/components/landing/search-intent-content"
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from "@/lib/seo"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const { locale, t } = await getI18n()
  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([organizationJsonLd(), websiteJsonLd()]),
        }}
      />
      <SiteHeader />
      <main className="flex-1">
        <Hero t={t.home} tCommon={t.common} locale={locale} />
        <CosmeticAreas t={t.home} locale={locale} />
        <PopularProcedures locale={locale} />
        <FeaturedDoctors />
        <SearchIntentContent locale={locale} />
        <FeaturedReviews />
        <FeaturedArticles />
        <TrustBand locale={locale} />
        <BeforeAfterShowcase />
        <CtaFooter />
      </main>
    </div>
  )
}
