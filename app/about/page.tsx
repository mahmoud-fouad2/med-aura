import { ShieldCheck, HeartHandshake, Sparkles, Globe, Lock, Stethoscope } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion"
import { getI18n } from "@/lib/i18n"

export const metadata = {
  title: "من نحن",
  description:
    "Med Aura منصة متخصصة في التجميل الطبي تربط المرضى بأطباء ومراكز معتمدة وتدير الرحلة التجميلية بثقة وأمان.",
}

export const dynamic = "force-dynamic"

export default async function AboutPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const values = [
    { icon: ShieldCheck, title: l("تحقّق فعلي من التراخيص", "License checks that affect visibility"), desc: l("لا يظهر الطبيب للعامة إلا بترخيص ساري وملف معتمد.", "A doctor can appear publicly only with an approved profile and a valid, unexpired license.") },
    { icon: Lock, title: l("وصول بإذنك", "Access under your control"), desc: l("لا يطّلع الطبيب على ملفات حالتك إلا بعد موافقتك، ويمكنك سحب الوصول.", "A doctor can view your case files only after you grant access, and you can withdraw it.") },
    { icon: Sparkles, title: l("خطوات واضحة", "Clear next steps"), desc: l("تتابع الاستشارة والخطة والسعر والحجز من مكان واحد.", "Keep consultation, planning, pricing, and booking together.") },
    { icon: HeartHandshake, title: l("متابعة بعد الإجراء", "Connected aftercare"), desc: l("تظل مهام المتابعة والتواصل مرتبطة بحالتك بعد الإجراء.", "Follow-up tasks and communication remain connected to your case.") },
    { icon: Globe, title: l("خيارات عبر عدة وجهات", "Options across destinations"), desc: l("قارن المواقع واللغات والعملات كما هي لدى كل مقدم خدمة.", "Compare locations, languages, and currencies as offered by each provider.") },
    { icon: Stethoscope, title: l("تركيز على الرعاية التجميلية", "Focused on aesthetic care"), desc: l("المعلومات ومسارات الحجز مصممة لقرارات وإجراءات التجميل الطبي.", "Information and booking journeys are designed around aesthetic care decisions.") },
  ]
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("من نحن", "About Med Aura")}
          title={l("رحلة تجميلية أوضح من أول مقارنة", "A clearer aesthetic care journey")}
          subtitle={l("نساعدك على مقارنة مقدمي الرعاية، مشاركة حالتك، وحفظ خطوات الاستشارة والمتابعة في مكان واحد.", "Compare providers, share your case privately, and keep consultation and aftercare steps in one place.")}
          primary={{ href: "/search", label: l("ابحث عن طبيب", "Find a doctor") }}
          secondary={{ href: "/how-it-works", label: l("كيف نعمل", "How it works") }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow={l("لماذا بنينا Med Aura", "Why we built Med Aura")}
                title={l("لأن القرار يحتاج معلومات قابلة للمقارنة", "Because better decisions need comparable information")}
                subtitle={l("جمعنا البحث والاستشارة والخطة والسعر والحجز والمتابعة في مسار واحد لتعرف ما الخطوة التالية.", "We brought search, consultation, planning, pricing, booking, and follow-up into one journey with a clear next step.")}
              />
            </Reveal>
          </div>
        </section>

        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={l("قيمنا", "Our principles")} title={l("ما الذي يوجّه عملنا", "What guides the product")} />
            <div className="mt-12">
              <FeatureGrid items={values} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
