import { SiteHeader } from "@/components/layout/site-header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Specialties } from "@/components/landing/specialties"
import { CtaFooter } from "@/components/landing/cta-footer"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <Specialties />
        <CtaFooter />
      </main>
    </div>
  )
}
