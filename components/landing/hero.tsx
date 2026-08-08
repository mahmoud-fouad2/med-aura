import Link from "next/link"
import Image from "next/image"
import {
  Search,
  ShieldCheck,
  FileLock2,
  Star,
  ClipboardList,
  Video,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FadeIn } from "@/components/motion"
import type { Dictionary, Locale } from "@/lib/i18n"

const quickSearches = [
  { label: "تجميل الأنف", labelEn: "Rhinoplasty", q: "تجميل الأنف" },
  { label: "شد الوجه", labelEn: "Facelift", q: "شد الوجه" },
  { label: "البوتوكس", labelEn: "Botox", q: "البوتوكس" },
  { label: "زراعة الشعر", labelEn: "Hair Transplant", q: "زراعة الشعر" },
]

export function Hero({ 
  t, 
  tCommon, 
  locale 
}: { 
  t: Dictionary["home"]
  tCommon: Dictionary["common"]
  locale: Locale
}) {
  const isAr = locale === "ar"

  const heroHighlights = [
    {
      icon: ClipboardList,
      title: isAr ? "خطة وسعر واضح" : "Clear Plan & Price",
      desc: isAr
        ? "تعرف على خطة العلاج والسعر قبل اتخاذ القرار"
        : "See your treatment plan and price before deciding",
    },
    {
      icon: Video,
      title: isAr ? "استشارة فيديو" : "Video Consultation",
      desc: isAr
        ? "تحدث مع الطبيب من راحتك وفي وقت يناسبك"
        : "Talk to your doctor from home, on your schedule",
    },
    {
      icon: ShieldCheck,
      title: isAr ? "طبيب موثّق" : "Verified Doctor",
      desc: isAr
        ? "أطباء معتمدون ومراجعون بدقة"
        : "Accredited doctors, carefully reviewed",
    },
  ]

  const trustPoints = [
    { icon: Star, label: isAr ? "تقييمات موثّقة" : "Verified Reviews" },
    { icon: FileLock2, label: isAr ? "حماية ملفاتك الطبية" : "Medical File Protection" },
    { icon: ShieldCheck, label: isAr ? "تحقّق من التراخيص" : "License Verification" },
  ]

  const journeySteps = [
    {
      title: isAr ? "اختيار الإجراء المناسب" : "Choose the right procedure",
      desc: isAr ? "ابدأ من البحث والمقارنة قبل أي قرار." : "Start with search and comparison before any decision.",
    },
    {
      title: isAr ? "استشارة موثّقة" : "Verified consultation",
      desc: isAr ? "شارك حالتك مع طبيب مناسب وبخصوصية واضحة." : "Share your case privately with the right doctor.",
    },
    {
      title: isAr ? "خطة وسعر واضحان" : "Clear plan and price",
      desc: isAr ? "اعرف الخطوات التالية بتفاصيل مفهومة." : "See the next steps with clarity before you travel or book.",
    },
  ]

  return (
    <section className="relative isolate min-h-svh overflow-hidden border-b border-border bg-background">
      <Image
        src="/hero-medaura-consultation.png"
        alt={isAr ? "استشارة تجميلية في عيادة Med Aura" : "Aesthetic consultation at Med Aura"}
        fill
        priority
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 -z-20 object-cover object-left"
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklab,var(--background)_78%,transparent)_43%,var(--background)_68%,var(--background)_100%)] ltr:bg-[linear-gradient(270deg,transparent_0%,color-mix(in_oklab,var(--background)_78%,transparent)_43%,var(--background)_68%,var(--background)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--gold)_13%,transparent),transparent_28%),radial-gradient(circle_at_bottom_left,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_26%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <div className="mx-auto grid min-h-svh max-w-7xl items-center gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:px-8">
        <FadeIn className="me-auto flex w-full max-w-2xl flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3.5 py-1.5 text-sm font-semibold text-primary shadow-sm backdrop-blur-md">
            <Sparkles className="size-4 text-gold" />
            {isAr ? "اختيارك الجمالي يبدأ بخبير موثوق" : "Trusted aesthetic care, clearly guided"}
          </span>

          <h1 className="text-balance font-heading text-5xl font-bold leading-[1.12] text-foreground sm:text-6xl lg:text-7xl">
            {t.heroTitle}
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-8 text-foreground/75 sm:text-xl">
            {t.heroSubtitle}
          </p>

          <form
            action="/search"
            method="get"
            className="flex w-full max-w-2xl items-center gap-2 rounded-[1.35rem] border border-white/70 bg-card/92 p-2 shadow-elegant-lg backdrop-blur-md"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 start-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder={t.searchPlaceholder}
                className="h-14 border-0 bg-transparent ps-12 text-base shadow-none focus-visible:ring-0 focus:ring-0"
                aria-label={t.searchPlaceholder}
              />
            </div>
            <Button type="submit" size="lg" className="h-14 shrink-0 rounded-2xl px-5 sm:px-7">
              <Search className="size-5" />
              <span className="hidden sm:inline">{tCommon.search}</span>
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {isAr ? "إجراءات شائعة:" : "Popular:"}
            </span>
            {quickSearches.map((s) => (
              <Link
                key={s.label}
                href={`/search?q=${encodeURIComponent(s.q)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-background/78 px-3.5 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:text-primary"
              >
                <Sparkles className="size-3.5 text-gold" />
                {isAr ? s.label : s.labelEn}
              </Link>
            ))}
          </div>

          <div className="grid max-w-2xl gap-3 pt-4 sm:grid-cols-3">
            {trustPoints.map((tp) => (
              <TrustPoint key={tp.label} icon={tp.icon} label={tp.label} />
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="w-full">
          <div className="rounded-[2rem] border border-white/70 bg-card/74 p-4 shadow-elegant-lg backdrop-blur-xl">
            <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_88%,white)_0%,color-mix(in_oklab,var(--primary)_66%,black)_100%)] p-5 text-primary-foreground shadow-elegant">
              <p className="text-sm font-semibold text-primary-foreground/70">
                {isAr ? "رحلة أوضح" : "Clearer journey"}
              </p>
              <h2 className="mt-2 font-heading text-2xl font-bold leading-tight">
                {isAr ? "من المقارنة إلى الحجز بثقة" : "From comparison to booking with confidence"}
              </h2>
              <div className="mt-5 space-y-3">
                {journeySteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 font-heading text-sm font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-heading text-base font-bold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-primary-foreground/72">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {heroHighlights.map((h) => (
                <div
                  key={h.title}
                  className="flex items-center gap-3 rounded-[1.4rem] border border-white/70 bg-background/88 p-4 shadow-sm"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                    <h.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold leading-snug text-foreground">
                      {h.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {h.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function TrustPoint({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/70 bg-card/82 p-4 shadow-sm backdrop-blur-md">
      <Icon
        className="size-6 shrink-0"
        style={{ color: "oklch(0.6 0.1 85)" }}
        aria-hidden="true"
      />
      <span className="text-sm font-semibold leading-snug text-foreground/85">
        {label}
      </span>
    </div>
  )
}
