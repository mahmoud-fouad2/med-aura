import { SiteHeader } from "@/components/layout/site-header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { CosmeticAreas } from "@/components/landing/cosmetic-areas"
import { CtaFooter } from "@/components/landing/cta-footer"
import { getI18n } from "@/lib/i18n"

export default async function HomePage() {
  const { t } = await getI18n()
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero t={t.home} />
        <CosmeticAreas t={t.home} />
        <Features t={t.home} />
        <CtaFooter />
      </main>
    </div>
  )
}
