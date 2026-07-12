import {
  Search,
  FileLock2,
  ShieldCheck,
  CalendarCheck,
  ClipboardList,
  HeartHandshake,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Stagger, StaggerItem } from "@/components/motion"
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "كيف تعمل المنصة",
  description:
    "تعرّف على رحلتك في Med Aura خطوة بخطوة: من اختيار الطبيب أو المركز حتى الاستشارة والمتابعة.",
  path: "/how-it-works",
  image: "/demo-services/aesthetic-clinic-lounge.png",
})

const steps: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Search, title: "اختيار واعي", desc: "ابدأ بالإجراء الذي يهمك، ثم قارن بين الأطباء والمراكز حسب الخبرة والموقع ونوع الاستشارة." },
  { icon: FileLock2, title: "مشاركة منظّمة", desc: "أضف تفاصيل حالتك والصور المطلوبة في ملف واحد واضح يسهّل على الطبيب فهم احتياجك." },
  { icon: ShieldCheck, title: "تحكم بخصوصيتك", desc: "أنت تختار الطبيب الذي يرى ملفك، وتستطيع إيقاف المشاركة عندما تحتاج." },
  { icon: CalendarCheck, title: "استشارة مناسبة", desc: "اختر موعدًا يناسبك، وتعرّف على الخيارات الممكنة قبل أي التزام." },
  { icon: ClipboardList, title: "خطة وسعر", desc: "تحصل على تصور أوضح للخطوات والتكلفة، لتتخذ قرارك بهدوء." },
  { icon: HeartHandshake, title: "متابعة بعد الإجراء", desc: "بعد الحجز والتنفيذ، تبقى خطوات المتابعة والتنبيهات في مكان واحد." },
]

export default function HowItWorksPage() {
  const structuredData = [
    breadcrumbJsonLd([
      { name: "الرئيسية", url: absoluteUrl("/") },
      { name: "كيف تعمل المنصة", url: absoluteUrl("/how-it-works") },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "كيف تعمل Med Aura",
      description:
        "خطوات اختيار طبيب أو مركز تجميل، مشاركة الحالة، حجز الاستشارة، ومتابعة الرحلة.",
      image: absoluteUrl("/demo-services/aesthetic-clinic-lounge.png"),
      step: steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.title,
        text: step.desc,
      })),
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
          eyebrow="رحلة واضحة"
          title="كيف تعمل Med Aura"
          subtitle="نرافقك في كل خطوة من رحلتك التجميلية، مع وضوح في المعلومات وحماية لبياناتك."
          imageSrc="/demo-services/aesthetic-clinic-lounge.png"
          imageAlt="مساحة استقبال عيادة تجميلية"
          stats={[
            { label: "الاختيار", value: "أسهل" },
            { label: "الملف", value: "منظّم" },
            { label: "المتابعة", value: "مستمرة" },
          ]}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, i) => (
                <StaggerItem key={step.title}>
                  <div className="group/feature relative flex h-full flex-col gap-4.5 rounded-2xl border border-white/60 bg-card/85 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/45 hover:shadow-elegant-lg backdrop-blur-sm">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.82_0.08_85)] to-[oklch(0.62_0.11_75)] text-white shadow-elegant ring-1 ring-gold/30 transition-transform duration-300 group-hover/feature:scale-105">
                      <step.icon className="size-6" />
                    </span>
                    <div>
                      <span className="font-heading text-sm font-bold" style={{ color: "oklch(0.52 0.1 85)" }}>
                        {`٠${i + 1}`}
                      </span>
                      <h2 className="mt-1 font-heading text-lg font-bold text-foreground">
                        {step.title}
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.desc}
                    </p>
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
