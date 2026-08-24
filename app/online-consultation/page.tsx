import Image from "next/image"
import { Video, FileLock2, ClipboardList, ShieldCheck, Mic, PhoneOff, Lock } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import { SITE_NAME, absoluteUrl, breadcrumbJsonLd, buildPageMetadata, jsonLdScript } from "@/lib/seo"
import { getI18n } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"
import { PUBLIC_MEDIA } from "@/lib/public-media"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "الاستشارة أونلاين" : "Online aesthetic consultation",
    description: locale === "ar"
      ? "احجز استشارة فيديو وشارك حالتك بخصوصية قبل اتخاذ قرارك."
      : "Book a video consultation and share your case privately before making a decision.",
    path: "/online-consultation",
    image: PUBLIC_MEDIA.onlineConsultation,
    locale,
  })
}

export const dynamic = "force-dynamic"

export default async function OnlineConsultationPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const features = [
    { icon: Video, title: l("استشارة مرئية براحة تامة من مكانكِ", "Meet from wherever you are"), desc: l("تواصلي مباشرة مع طبيبكِ المفضل في موعد يناسبكِ لمناقشة تطلعاتكِ بكل خصوصية قبل السفر أو زيارة المركز.", "Speak with your doctor before travelling or visiting a center.") },
    { icon: FileLock2, title: l("مشاركة آمنة ومشفرة لملفكِ", "Private sharing"), desc: l("ارفعي صوركِ وتقاريركِ الطبية بأمان تام، مع تحكمكِ الكامل فيمن يطلع عليها وإمكانية سحب الإذن بأي وقت.", "Share the requested photos and reports and control who can view them.") },
    { icon: ClipboardList, title: l("خطة علاجية دقيقة وتكلفة واضحة", "A clear plan"), desc: l("تحصلين بعد الاستشارة على تقرير طبي شامل يوضح الخطوات المقترحة، البدائل، والتقدير المالي الدقيق.", "Understand suitable options and expected costs after your consultation.") },
    { icon: ShieldCheck, title: l("نخبة من كبار أطباء التجميل", "Carefully selected doctors"), desc: l("أطباء مرخصون واستشاريون ذوو خبرة دولية تم التحقق من مؤهلاتهم وتراخيصهم المهنية بعناية فائقة.", "Doctors appear only after their credentials and license are reviewed.") },
  ]
  const steps = isAr
    ? ["استكشفي الأطباء المعتمدين واختاري الطبيب الأنسب لاحتياجكِ.", "أنشئي ملف حالتكِ وارفعي الصور والتقارير الطبية المطلوبة بسرية.", "امنحي الطبيب إذن استعراض حالتكِ لبدء دراستها قبل اللقاء.", "حددي موعد الاستشارة المرئية المناسب لكِ وأتمي الدفع الآمن.", "التقي بطبيبكِ عبر اتصال فيديو مشفر، واستلمي خطتكِ العلاجية وعرض السعر."]
    : ["Choose a licensed doctor from search results.", "Create your case and upload the requested files.", "Grant the doctor access to your case.", "Choose an available time and pay securely.", "Join the video consultation and receive your plan and quote."]
  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: absoluteUrl("/") },
      { name: l("الاستشارة أونلاين", "Online consultation"), url: absoluteUrl("/online-consultation") },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "الاستشارة التجميلية أونلاين",
      alternateName: "Online aesthetic consultation",
      description:
        "استشارة فيديو مع طبيب تجميل معتمد، مع مشاركة آمنة للصور والتقارير وخطة واضحة قبل القرار.",
      image: absoluteUrl(PUBLIC_MEDIA.onlineConsultation),
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("الاستشارة أونلاين", "Online consultation")}
          title={l("استشارتك التجميلية تبدأ من مكانك", "Start your consultation from home")}
          subtitle={l("احجز استشارة فيديو مع طبيب معتمد، وشارك حالتك بخصوصية، واحصل على خطة واضحة قبل أي خطوة.", "Book a video consultation with a licensed doctor, share your case privately, and understand the plan before taking the next step.")}
          primary={{ href: `${localizedPath("/search", locale)}?consultation=VIDEO_CONSULTATION`, label: l("ابحث عن طبيب للاستشارة", "Find a doctor") }}
          secondary={{ href: localizedPath("/how-it-works", locale), label: l("كيف تعمل المنصة", "How it works") }}
          imageSrc={PUBLIC_MEDIA.onlineConsultation}
          imageAlt={l("استشارة تجميلية عبر الفيديو", "Online aesthetic consultation")}
          stats={[
            { label: l("الاختيار", "Choice"), value: l("طبيب مناسب", "Right doctor") },
            { label: l("المشاركة", "Sharing"), value: l("بإذنك", "With consent") },
            { label: l("القرار", "Decision"), value: l("أوضح", "More clarity") },
          ]}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={l("لماذا الاستشارة أونلاين", "Why consult online") } title={l("مزايا مصممة لراحتك", "Designed around your comfort")} />
            <div className="mt-12">
              <FeatureGrid items={features} className="lg:grid-cols-4" />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <SectionHeading eyebrow={l("الخطوات", "Steps")} title={l("كيف تحجز استشارتك", "How to book your consultation")} align="start" />
              <Stagger className="mt-10 space-y-4">
                {steps.map((s, i) => (
                  <StaggerItem key={i}>
                    <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <p className="pt-1 text-foreground">{s}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
            <div className="relative order-first mx-auto aspect-4/5 w-full max-w-md overflow-hidden rounded-lg border border-border lg:order-last">
              <Image
                src={PUBLIC_MEDIA.onlineConsultation}
                alt={l("استشارة تجميلية عبر الفيديو مع طبيب معتمد", "Video consultation with a licensed doctor")}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 28rem, 90vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/25" />

              <div className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                <Lock className="size-3.5" />
                {l("اتصال آمن ومشفّر", "Secure encrypted call")}
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
