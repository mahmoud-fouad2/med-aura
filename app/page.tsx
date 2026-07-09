import { SiteHeader } from "@/components/layout/site-header"
import { Hero } from "@/components/landing/hero"
import { CosmeticAreas } from "@/components/landing/cosmetic-areas"
import { PopularProcedures } from "@/components/landing/popular-procedures"
import { Features } from "@/components/landing/features"
import { FeaturedDoctors } from "@/components/landing/featured-doctors"
import { TrustBand } from "@/components/landing/trust-band"
import { BeforeAfterShowcase } from "@/components/landing/before-after-showcase"
import { CtaFooter } from "@/components/landing/cta-footer"
import { getI18n } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const { locale, t } = await getI18n()
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero t={t.home} tCommon={t.common} locale={locale} />
        <CosmeticAreas t={t.home} locale={locale} />
        <PopularProcedures />
        <Features t={t.home} locale={locale} />
        <FeaturedDoctors />
        <TrustBand />
        <BeforeAfterShowcase />
        <CtaFooter />
      </main>
    </div>
  )
}
