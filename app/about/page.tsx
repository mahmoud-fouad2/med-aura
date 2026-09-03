import Link from "next/link"
import { ShieldCheck, HeartHandshake, Sparkles, Globe, Lock, Stethoscope } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion"
import { getI18n, localizedPath } from "@/lib/i18n"
import { buildPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "عن Med Aura" : "About Med Aura",
    description: locale === "ar"
      ? "تعرف على Med Aura وكيف تساعدك المنصة على مقارنة خيارات التجميل وإدارة الاستشارة والمتابعة."
      : "Learn how Med Aura helps people compare aesthetic-care options and manage consultation and follow-up.",
    path: "/about",
    locale,
  })
}

export const dynamic = "force-dynamic"

export default async function AboutPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const values = [
    { icon: ShieldCheck, title: l("مراجعة البيانات المهنية", "Professional Detail Review"), desc: l("يظهر الطبيب أو المركز بعد قبول ملفه ومراجعة بيانات الترخيص المقدمة وصلاحيتها.", "A provider appears publicly after profile approval and review of submitted license details and validity.") },
    { icon: Lock, title: l("خصوصية الوصول إلى حالتكِ", "Private Case Access"), desc: l("تصل ملفات الحالة إلى الأطراف المخوّلة ضمن رحلة الرعاية، ويمكنكِ مراجعة الوصول من حسابكِ.", "Case files are available to authorized participants in your care journey, with access visible in your account.") },
    { icon: Sparkles, title: l("خطة وتكلفة قابلة للمراجعة", "Reviewable Plan and Pricing"), desc: l("احتفظي بتفاصيل الاستشارة والخطة والأسعار المقدمة داخل رحلة واحدة قبل اتخاذ القرار.", "Keep consultation details, proposed plans, and quoted prices together before deciding.") },
    { icon: HeartHandshake, title: l("متابعة مرتبطة بالحالة", "Connected Aftercare"), desc: l("تبقى مهام المتابعة والتواصل مرتبطة بملف الحالة لتسهيل الرجوع إليها.", "Follow-up tasks and communication remain connected to your case.") },
    { icon: Globe, title: l("مقارنة الوجهات المتاحة", "Available Destination Comparison"), desc: l("قارني المواقع واللغات والعملات التي يقدمها كل مزوّد منشور على المنصة.", "Compare locations, languages, and currencies offered by each published provider.") },
    { icon: Stethoscope, title: l("رحلة منظمة للقرار", "A Structured Decision Journey"), desc: l("تجمع المنصة البحث وملف الحالة والاستشارة والمتابعة في خطوات مترابطة.", "Search, case details, consultation, and follow-up stay connected in one journey.") },
  ]
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("عن Med Aura", "About Med Aura")}
          title={l("قرار تجميلي أوضح من البداية إلى المتابعة", "A clearer aesthetic care journey")}
          subtitle={l("قارني الملفات المنشورة، شاركي حالتكِ بخصوصية، واحتفظي بخطوات الاستشارة والمتابعة في مكان واحد.", "Compare providers, share your case privately, and keep consultation and aftercare steps in one place.")}
          primary={{ href: localizedPath("/search", locale), label: l("استكشفي الأطباء", "Find a doctor") }}
          secondary={{ href: localizedPath("/how-it-works", locale), label: l("كيف تعمل المنصة", "How it works") }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
            <Reveal>
              <div className="text-center space-y-6">
                <span className="text-gold font-bold tracking-widest text-sm uppercase">
                  {l("قصتنا", "Our Story")}
                </span>
                <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {l("لأن قراركِ الجمالي يستحق أعلى درجات العناية والوضوح", "Because better decisions need comparable information")}
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {l(
                    "بدأت فكرة Med Aura من حاجة واضحة في قطاع التجميل: صعوبة مقارنة المعلومات، وتشتت تفاصيل الحالة بين جهات متعددة، وحساسية مشاركة الصور الطبية. لذلك تجمع المنصة البحث وملف الحالة والاستشارة والمتابعة في رحلة واحدة قابلة للمراجعة.",
                    "Med Aura began with a clear need in aesthetic care: provider information is difficult to compare, case details become fragmented, and medical photos are sensitive. The platform brings discovery, case sharing, consultation, and follow-up into one reviewable journey."
                  )}
                </p>
              </div>
            </Reveal>

            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              <Reveal delay={0.1}>
                <div className="rounded-3xl bg-secondary/40 p-8 border border-border/60 h-full">
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-4">{l("رؤيتنا", "Our Vision")}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {l(
                      "أن تصبح مقارنة خيارات التجميل وفهم الرحلة الطبية أكثر وضوحًا للمرضى في المنطقة، دون اختصار القرار الطبي أو استبداله.",
                      "To make aesthetic-care comparison and the patient journey clearer across the region without replacing clinical judgment."
                    )}
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="rounded-3xl bg-secondary/40 p-8 border border-border/60 h-full">
                  <div className="size-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-6">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-4">{l("رسالتنا", "Our Mission")}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {l(
                      "توفير معلومات منظمة وأدوات تواصل ومتابعة تساعد المرضى ومقدمي الخدمة على إدارة الرحلة بوضوح ومسؤولية.",
                      "Provide organized information, communication, and follow-up tools that help patients and providers manage the journey responsibly."
                    )}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={l("قيمنا الأساسية", "Our principles")} title={l("ما الذي يوجّه عملنا", "What guides the product")} subtitle={l("وضوح المعلومات، خصوصية الوصول، ومسؤولية القرار الطبي.", "Clear information, private access, and responsible clinical decisions.")} />
            <div className="mt-16">
              <FeatureGrid items={values} />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30 border-b border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gold/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8 relative z-10">
            <Reveal>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
                {l("هل أنتِ مستعدة لبدء رحلتكِ؟", "Ready to start your journey?")}
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                {l("ابدئي بالمقارنة الهادئة، ثم اختاري الخطوة المناسبة لكِ بعد تقييم طبي مباشر.", "Start with a clear comparison, then choose your next step after direct clinical assessment.")}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href={localizedPath("/search", locale)} className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                  {l("ابحثي عن طبيبكِ الآن", "Find your doctor now")}
                </Link>
                <Link href={localizedPath("/sign-up", locale)} className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-secondary/80">
                  {l("إنشاء حساب مجاني", "Create free account")}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
