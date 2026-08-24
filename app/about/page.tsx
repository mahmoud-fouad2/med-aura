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
    { icon: ShieldCheck, title: l("نخبة معتمدة وتراخيص موثّقة", "Certified Experts & Verified Licenses"), desc: l("نلتزم بأعلى المعايير الطبية؛ فلا ينضم إلينا إلا أطباء ومراكز استوفت الفحص المهني الدقيق والتراخيص السارية.", "A doctor can appear publicly only with an approved profile and a valid, unexpired license.") },
    { icon: Lock, title: l("خصوصية مطلقة وأمان لبياناتك", "Absolute Privacy & Data Protection"), desc: l("ملفاتكِ وصوركِ الطبية مشفرة بالكامل، ولا يطلع عليها أي طبيب إلا بعد موافقتكِ الصريحة، مع إمكانية إلغاء الإذن في أي لحظة.", "A doctor can view your case files only after you grant access, and you can withdraw it.") },
    { icon: Sparkles, title: l("خطة علاجية مخصصة وتكلفة واضحة", "Clear Treatment Plan & Pricing"), desc: l("تحصلين على تصور طبي متكامل يشمل خطوات الإجراء، النتائج المتوقعة، والتكلفة الدقيقة بكل شفافية.", "Keep consultation, planning, pricing, and booking together.") },
    { icon: HeartHandshake, title: l("رعاية مستمرة ومتابعة بعد الإجراء", "Connected Aftercare & Support"), desc: l("نرافقكِ خطوة بخطوة أثناء فترة التعافي مع إرشادات دورية وتواصل مباشر مع فريق الرعاية.", "Follow-up tasks and communication remain connected to your case.") },
    { icon: Globe, title: l("أرقى الوجهات التجميلية العالمية", "Top Global Medical Destinations"), desc: l("استكشفي نخبة المراكز التجميلية في المملكة والخليج وتركيا مع مقارنة شفافة للخيارات والأسعار.", "Compare locations, languages, and currencies as offered by each provider.") },
    { icon: Stethoscope, title: l("تجربة مصممة لراحتكِ التامة", "Crafted for Aesthetic Excellence"), desc: l("صممنا كل تفصيلة في المنصة لتمنحكِ راحة البال والثقة في كل مرحلة من رحلتكِ الجمالية.", "Information and booking journeys are designed around aesthetic care decisions.") },
  ]
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("عن Med Aura", "About Med Aura")}
          title={l("رحلتكِ نحو الجمال بأعلى معايير الثقة والأمان", "A clearer aesthetic care journey")}
          subtitle={l("نرافقكِ في اختيار أفضل أطباء ومراكز التجميل المعتمدة، مع استشارات مرئية مريحة وخصوصية تامة لملفاتكِ الطبية.", "Compare providers, share your case privately, and keep consultation and aftercare steps in one place.")}
          primary={{ href: "/search", label: l("استكشفي الأطباء", "Find a doctor") }}
          secondary={{ href: "/how-it-works", label: l("كيف نرافقكِ", "How it works") }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow={l("رؤيتنا ورسالتنا", "Why we built Med Aura")}
                title={l("لأن قراركِ الجمالي يستحق أعلى درجات العناية والوضوح", "Because better decisions need comparable information")}
                subtitle={l("جمعنا لكِ نخبة الأطباء، الاستشارة المرئية، التخطيط الطبي الدقيق، والرعاية اللاحقة في تجربة واحدة راقية ومطمئنة.", "We brought search, consultation, planning, pricing, booking, and follow-up into one journey with a clear next step.")}
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
