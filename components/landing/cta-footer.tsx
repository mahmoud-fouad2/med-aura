import Link from "next/link"
import { ArrowLeft, Stethoscope, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/layout/site-footer"
import { AvatarCluster } from "@/components/ui/avatar-cluster"
import { Reveal } from "@/components/motion"
import { getI18n } from "@/lib/i18n"
import { searchDoctors } from "@/lib/data/doctors"
import { query } from "@/lib/db/query"

export async function CtaFooter() {
  const [{ locale }, res] = await Promise.all([
    getI18n(),
    query(() => searchDoctors({ pageSize: 4 })),
  ])
  const isAr = locale === "ar"
  const doctors = res.status === "ok" ? res.data.results : []
  const totalDoctors = res.status === "ok" ? res.data.total : 0

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-[oklch(0.44_0.17_300)] to-[oklch(0.38_0.14_290)] px-6 py-14 text-primary-foreground shadow-elegant-lg sm:px-14">
              {/* decorative grid + orbs */}
              <div className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-10 size-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
                <h2 className="text-balance font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {isAr ? "هل أنت طبيب أو مركز تجميل؟" : "Are you a doctor or an aesthetic center?"}
                </h2>
                <p className="text-pretty text-lg leading-relaxed text-primary-foreground/90">
                  {isAr 
                    ? "انضم إلى Med Aura بعد التحقق من تراخيصك، واعرض خدماتك أمام مرضى يبحثون عن رعاية تجميلية موثوقة من السعودية والخليج والعالم."
                    : "Join Med Aura after verifying your license, and showcase your services to patients seeking trusted aesthetic care from Saudi Arabia, the Gulf, and the world."}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    variant="secondary"
                    render={
                      <Link href="/for-doctors">
                        <Stethoscope className="size-5" />
                        {isAr ? "انضم كطبيب" : "Join as a doctor"}
                      </Link>
                    }
                  />
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
                    render={
                      <Link href="/for-centers">
                        <Building2 className="size-5" />
                        {isAr ? "سجّل مركزك" : "Register your center"}
                        <ArrowLeft className="size-4 transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover/button:-translate-x-1 ltr:group-hover/button:translate-x-1" />
                      </Link>
                    }
                  />
                </div>
                {totalDoctors > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <AvatarCluster names={doctors.map((d) => d.name)} />
                    <p className="text-sm text-primary-foreground/85">
                      {isAr
                        ? `انضم إلى ${totalDoctors.toLocaleString("ar-SA-u-nu-latn")} طبيبًا موثّقًا بالفعل على المنصة`
                        : `Join ${totalDoctors.toLocaleString("en-US")} verified doctors already on the platform`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
