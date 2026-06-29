import { Video, FileLock2, ClipboardList, ShieldCheck } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

export const metadata = {
  title: "الاستشارة أونلاين",
  description:
    "احجز استشارة تجميلية عبر الفيديو مع أطباء معتمدين، وشارك حالتك بأمان قبل اتخاذ قرارك.",
}

const features = [
  { icon: Video, title: "استشارة فيديو", desc: "تحدّث مع طبيبك مباشرة من مكانك، دون عناء السفر للاستشارة الأولى." },
  { icon: FileLock2, title: "شارك حالتك بأمان", desc: "ارفع صورك وتقاريرك في مساحة خاصة، وامنح الطبيب الإذن قبل الاطلاع." },
  { icon: ClipboardList, title: "خطة وسعر واضح", desc: "استلم تقييم الطبيب وخطة العلاج وعرض السعر بعد الاستشارة." },
  { icon: ShieldCheck, title: "أطباء معتمدون فقط", desc: "كل طبيب على المنصة تم التحقق من ترخيصه قبل ظهوره." },
]

const steps = [
  "اختر طبيبًا معتمدًا من نتائج البحث.",
  "أنشئ حالتك وارفع الصور والتقارير المطلوبة.",
  "امنح الطبيب إذن الاطلاع على حالتك.",
  "احجز موعدًا متاحًا وادفع رسوم الاستشارة بأمان.",
  "أجرِ الاستشارة عبر الفيديو، واستلم الخطة وعرض السعر.",
]

export const dynamic = "force-dynamic"

export default function OnlineConsultationPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الاستشارة أونلاين"
          title="استشارتك التجميلية تبدأ من مكانك"
          subtitle="احجز استشارة فيديو مع طبيب معتمد، وشارك حالتك بخصوصية تامة، واحصل على خطة وسعر واضح قبل أي خطوة."
          primary={{ href: "/search?consultation=VIDEO_CONSULTATION", label: "ابحث عن طبيب للاستشارة" }}
          secondary={{ href: "/how-it-works", label: "كيف تعمل المنصة" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="لماذا الاستشارة أونلاين" title="مزايا مصممة لراحتك" />
            <div className="mt-12">
              <FeatureGrid items={features} className="lg:grid-cols-4" />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="الخطوات" title="كيف تحجز استشارتك" align="start" />
            <Stagger className="mt-10 space-y-4">
              {steps.map((s, i) => (
                <StaggerItem key={i}>
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-foreground">{s}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
