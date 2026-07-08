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
  { icon: ShieldCheck, title: "تحقّق حقيقي من التراخيص", desc: "لا يُنشر طبيب أو مركز على المنصة قبل مراجعة ترخيصه من فريقنا؛ والملفات منتهية الصلاحية تُوقَف تلقائيًا." },
  { icon: Lock, title: "ملفاتك مشفَّرة ومحكومة بإذنك", desc: "لا يرى طبيبك صورك أو تقاريرك إلا بعد موافقتك الصريحة، وبإمكانك سحب هذا الإذن في أي وقت." },
  { icon: Sparkles, title: "خطوات واضحة من أول يوم", desc: "تعرف مكانك بالضبط في رحلتك — من الاستشارة إلى الخطة والسعر، وحتى تأكيد الموعد." },
  { icon: HeartHandshake, title: "متابعة بعد الإجراء", desc: "لا تنتهي علاقتك بالمنصة عند الحجز؛ نتابع معك بعد الإجراء ونربطك بطبيبك عند الحاجة." },
  { icon: Globe, title: "تغطية إقليمية حقيقية", desc: "أطباء ومراكز في السعودية والخليج وتركيا ومصر ودول أخرى، بأسعار وعملات كل دولة." },
  { icon: Stethoscope, title: "التجميل الطبي فقط", desc: "لا نخلط الإجراءات التجميلية بتخصصات طبية أخرى — كل ما تراه هنا ضمن مجالنا مباشرة." },
]

export const dynamic = "force-dynamic"

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="من نحن"
          title="منصة تدير رحلتك التجميلية خطوة بخطوة"
          subtitle="Med Aura تربطك بأطباء ومراكز تجميل مرخّصين، وتتابع معك من أول استشارة حتى ما بعد الإجراء — بخصوصية كاملة وأسعار واضحة قبل أي التزام."
          primary={{ href: "/search", label: "ابحث عن طبيب" }}
          secondary={{ href: "/how-it-works", label: "كيف نعمل" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="لماذا بنينا Med Aura"
                title="لأن قرار التجميل يستحق معلومات واضحة"
                subtitle="البحث عن طبيب تجميل موثوق أمر مرهق غالبًا: تراخيص يصعب التحقق منها، وأسعار غير واضحة، ومتابعة تنقطع بعد الحجز. لذلك بنينا مسارًا واحدًا يجمع البحث والمقارنة والاستشارة والخطة العلاجية والسعر والحجز والمتابعة، بحيث تعرف دائمًا الخطوة التالية."
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
