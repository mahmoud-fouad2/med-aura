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
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, jsonLdScript } from "@/lib/seo"
import { PUBLIC_MEDIA } from "@/lib/public-media"
import { getI18n } from "@/lib/i18n"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "كيف تعمل المنصة" : "How Med Aura works",
    description: locale === "ar"
      ? "تعرّف على الرحلة من اختيار الطبيب حتى الاستشارة والمتابعة."
      : "See how Med Aura takes you from provider comparison to consultation and aftercare.",
    path: "/how-it-works",
    image: PUBLIC_MEDIA.howItWorks,
    locale,
  })
}

const stepsAr: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Search, title: "اختيار واعي", desc: "ابدأ بالإجراء الذي يهمك، ثم قارن بين الأطباء والمراكز حسب الخبرة والموقع ونوع الاستشارة." },
  { icon: FileLock2, title: "مشاركة منظّمة", desc: "أضف تفاصيل حالتك والصور المطلوبة في ملف واحد واضح يسهّل على الطبيب فهم احتياجك." },
  { icon: ShieldCheck, title: "تحكم بخصوصيتك", desc: "أنت تختار الطبيب الذي يرى ملفك، وتستطيع إيقاف المشاركة عندما تحتاج." },
  { icon: CalendarCheck, title: "استشارة مناسبة", desc: "اختر موعدًا يناسبك، وتعرّف على الخيارات الممكنة قبل أي التزام." },
  { icon: ClipboardList, title: "خطة وسعر", desc: "تحصل على تصور أوضح للخطوات والتكلفة، لتتخذ قرارك بهدوء." },
  { icon: HeartHandshake, title: "متابعة بعد الإجراء", desc: "بعد الحجز والتنفيذ، تبقى خطوات المتابعة والتنبيهات في مكان واحد." },
]

const stepsEn: typeof stepsAr = [
  { icon: Search, title: "Compare your options", desc: "Start with the procedure you need, then compare doctors and centers by experience, location, and consultation type." },
  { icon: FileLock2, title: "Share an organized case", desc: "Add your details and requested photos in one private file that helps the doctor understand your needs." },
  { icon: ShieldCheck, title: "Control your privacy", desc: "You choose which doctor can access your case and can withdraw access when needed." },
  { icon: CalendarCheck, title: "Book the right consultation", desc: "Choose a suitable time and understand your options before making a commitment." },
  { icon: ClipboardList, title: "Review the plan and price", desc: "Receive a clearer view of the next steps and expected cost before deciding." },
  { icon: HeartHandshake, title: "Continue with aftercare", desc: "Keep follow-up steps, recovery updates, and reminders together after your procedure." },
]

export default async function HowItWorksPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const steps = isAr ? stepsAr : stepsEn
  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: absoluteUrl("/") },
      { name: l("كيف تعمل المنصة", "How it works"), url: absoluteUrl("/how-it-works") },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: l("كيف تعمل Med Aura", "How Med Aura works"),
      description:
        l("خطوات اختيار طبيب أو مركز تجميل، مشاركة الحالة، حجز الاستشارة، ومتابعة الرحلة.", "Steps for choosing a doctor or center, sharing your case, booking a consultation, and managing follow-up."),
      image: absoluteUrl(PUBLIC_MEDIA.howItWorks),
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("رحلة واضحة", "A clear journey")}
          title={l("كيف تعمل Med Aura", "How Med Aura works")}
          subtitle={l("نرافقك في كل خطوة من رحلتك التجميلية، مع وضوح في المعلومات وحماية لبياناتك.", "Move from comparison to consultation and aftercare with clear information and control over your data.")}
          imageSrc={PUBLIC_MEDIA.howItWorks}
          imageAlt={l("استشارة مرئية مع طبيب تجميل", "Video consultation with an aesthetic doctor")}
          stats={[
            { label: l("الاختيار", "Choice"), value: l("أسهل", "Simpler") },
            { label: l("الملف", "Case"), value: l("منظّم", "Organized") },
            { label: l("المتابعة", "Aftercare"), value: l("مستمرة", "Connected") },
          ]}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, i) => (
                <StaggerItem key={step.title}>
                  <div className="group/feature relative flex h-full flex-col gap-4.5 rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-gold-gradient text-white ring-1 ring-gold/30 shadow-sm transition-transform duration-300 group-hover/feature:scale-105">
                      <step.icon className="size-6" />
                    </span>
                    <div>
                      <span className="font-heading text-xs font-bold tracking-widest text-gold uppercase">
                        {String(i + 1).padStart(2, "0")}
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
