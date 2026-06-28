import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/layout/site-footer"

export function CtaFooter() {
  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.4_0.15_300)] px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              هل أنت طبيب أو مركز تجميل؟
            </h2>
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-primary-foreground/90">
              انضم إلى Med Aura بعد التحقق من تراخيصك، واعرض خدماتك أمام مرضى
              يبحثون عن رعاية تجميلية موثوقة.
            </p>
            <Button
              size="lg"
              variant="secondary"
              render={<Link href="/sign-up">قدّم طلب انضمام</Link>}
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
