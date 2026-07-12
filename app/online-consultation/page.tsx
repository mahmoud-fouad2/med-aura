import Image from "next/image"
import { Video, FileLock2, ClipboardList, ShieldCheck, Mic, PhoneOff, Lock } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import { SITE_NAME, absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "الاستشارة أونلاين",
  description:
    "احجز استشارة تجميلية عبر الفيديو مع أطباء معتمدين، وشارك حالتك بخصوصية قبل اتخاذ قرارك.",
  path: "/online-consultation",
  image: "/demo-services/service-online-consultation.png",
})

const features = [
  { icon: Video, title: "لقاء مريح من مكانك", desc: "تحدّث مع الطبيب في موعد يناسبك قبل السفر أو زيارة المركز." },
  { icon: FileLock2, title: "مشاركة مطمئنة", desc: "أرسل الصور والتقارير المطلوبة، واختر من يستطيع الاطلاع عليها." },
  { icon: ClipboardList, title: "خطة مفهومة", desc: "بعد الاستشارة تعرف الخيارات المناسبة والتكلفة المتوقعة بوضوح." },
  { icon: ShieldCheck, title: "أطباء مختارون بعناية", desc: "لا يظهر الطبيب إلا بعد مراجعة بياناته المهنية وترخيصه." },
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
  const structuredData = [
    breadcrumbJsonLd([
      { name: "الرئيسية", url: absoluteUrl("/") },
      { name: "الاستشارة أونلاين", url: absoluteUrl("/online-consultation") },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "الاستشارة التجميلية أونلاين",
      alternateName: "Online aesthetic consultation",
      description:
        "استشارة فيديو مع طبيب تجميل معتمد، مع مشاركة آمنة للصور والتقارير وخطة واضحة قبل القرار.",
      image: absoluteUrl("/demo-services/service-online-consultation.png"),
      url: absoluteUrl("/online-consultation"),
      provider: {
        "@type": "Organization",
        name: SITE_NAME,
        url: absoluteUrl("/"),
      },
      serviceType: "Online medical consultation",
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: absoluteUrl("/search?consultation=VIDEO_CONSULTATION"),
      },
      areaServed: ["Saudi Arabia", "United Arab Emirates", "Türkiye"],
      inLanguage: ["ar", "en"],
    },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الاستشارة أونلاين"
          title="استشارتك التجميلية تبدأ من مكانك"
          subtitle="احجز استشارة فيديو مع طبيب معتمد، وشارك حالتك بخصوصية تامة، واحصل على خطة وسعر واضح قبل أي خطوة."
          primary={{ href: "/search?consultation=VIDEO_CONSULTATION", label: "ابحث عن طبيب للاستشارة" }}
          secondary={{ href: "/how-it-works", label: "كيف تعمل المنصة" }}
          imageSrc="/demo-services/service-online-consultation.png"
          imageAlt="استشارة تجميلية في عيادة حديثة"
          stats={[
            { label: "الاختيار", value: "طبيب مناسب" },
            { label: "المشاركة", value: "بإذنك" },
            { label: "القرار", value: "أوضح" },
          ]}
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
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
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
            <div className="relative order-first mx-auto aspect-4/5 w-full max-w-md overflow-hidden rounded-[2rem] border border-border shadow-elegant-lg lg:order-last">
              <Image
                src="/demo-services/service-online-consultation.png"
                alt="استشارة تجميلية عبر الفيديو مع طبيب معتمد"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 28rem, 90vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/25" />

              <div className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                <Lock className="size-3.5" />
                اتصال آمن ومشفّر
              </div>

              <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
                  <Mic className="size-4.5" />
                </span>
                <span className="flex size-12 items-center justify-center rounded-full bg-destructive text-white shadow-elegant">
                  <PhoneOff className="size-5" />
                </span>
                <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
                  <Video className="size-4.5" />
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
