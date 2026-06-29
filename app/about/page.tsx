import { ShieldCheck, HeartHandshake, Sparkles, Globe, Lock, Stethoscope } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion"

export const metadata = {
  title: "من نحن",
  description:
    "Med Aura منصة متخصصة في التجميل الطبي تربط المرضى بأطباء ومراكز معتمدة وتدير الرحلة التجميلية بثقة وأمان.",
}

const values = [
  { icon: ShieldCheck, title: "الثقة أولًا", desc: "نتحقق من تراخيص كل مقدّم خدمة قبل نشره، ولا نعرض إلا ما هو موثّق." },
  { icon: Lock, title: "خصوصية صارمة", desc: "ملفاتك الطبية خاصة، لا يطّلع عليها أحد إلا بإذنك، وكل وصول مُسجَّل." },
  { icon: Sparkles, title: "تجربة راقية", desc: "تصميم حديث وتجربة سلسة تليق بقرار مهم مثل قرارك التجميلي." },
  { icon: HeartHandshake, title: "رعاية متكاملة", desc: "نرافقك من الاستشارة حتى المتابعة بعد الإجراء، لا مجرد حجز." },
  { icon: Globe, title: "للسعودية والخليج والعالم", desc: "نربطك بنخبة من مقدّمي الخدمة محليًا ودوليًا في مجال التجميل." },
  { icon: Stethoscope, title: "تخصص حصري", desc: "نركّز حصريًا على التجميل الطبي، لا على كل التخصصات العامة." },
]

export const dynamic = "force-dynamic"

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="من نحن"
          title="نُعيد تعريف رحلة التجميل الطبي"
          subtitle="Med Aura منصة متخصصة حصريًا في التجميل الطبي، تجمع بين الموثوقية والخصوصية والتجربة الراقية لتساعدك على اتخاذ قرار مطمئن."
          primary={{ href: "/search", label: "ابحث عن طبيب" }}
          secondary={{ href: "/how-it-works", label: "كيف نعمل" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="رسالتنا"
                title="قرار تجميلي مبني على ثقة ومعرفة"
                subtitle="نؤمن بأن القرار التجميلي يستحق معلومات واضحة، ومقدّمي خدمة موثوقين، ومسارًا منظمًا يحفظ خصوصيتك وكرامتك. لذلك بنينا منصة تدير الرحلة كاملة — من البحث والمقارنة، إلى الاستشارة والخطة العلاجية وعرض السعر، وصولًا إلى الإجراء والمتابعة."
              />
            </Reveal>
          </div>
        </section>

        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="قيمنا" title="ما الذي يوجّه عملنا" />
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
