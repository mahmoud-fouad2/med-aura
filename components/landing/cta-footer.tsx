import Link from "next/link"
import Image from "next/image"
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
        <Reveal>
          <div className="relative isolate overflow-hidden border-y border-primary/20 bg-primary text-primary-foreground">
            <Image
              src="/hero-medaura-consultation.png"
              alt=""
              fill
              className="absolute inset-0 -z-20 object-cover object-left opacity-28"
              sizes="100vw"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--primary)_90%,transparent)_0%,var(--primary)_46%,color-mix(in_oklab,var(--primary)_72%,transparent)_100%)]" />
            <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_.7fr] lg:px-8">
              <div className="flex max-w-3xl flex-col items-start gap-6 text-start">
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
              <div className="hidden justify-end lg:flex">
                <div className="rounded-3xl border border-white/20 bg-white/12 p-5 text-sm leading-7 text-primary-foreground/90 backdrop-blur-md">
                  {isAr
                    ? "ملفك يظهر للمرضى داخل تجربة راقية وواضحة، مع طلبات منظمة ومتابعة أسهل."
                    : "Your profile appears inside a polished patient journey, with clearer requests and easier follow-up."}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </>
  )
}
