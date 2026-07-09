import Link from "next/link"
import Image from "next/image"
import { Search, ShieldCheck, FileLock2, Star, ClipboardList, Video } from "lucide-react"
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
      desc: isAr ? "تقييم وعرض سعر بعد الاستشارة" : "Assessment & quote after consult",
    },
    {
      icon: Video,
      title: isAr ? "استشارة فيديو" : "Video Consultation",
      desc: isAr ? "تواصل مباشر دون عناء السفر" : "Direct contact, no travel",
    },
    {
      icon: ShieldCheck,
      title: isAr ? "طبيب موثّق" : "Verified Doctor",
      desc: isAr ? "ترخيص تم التحقق منه فعليًا" : "Actually license-checked",
    },
  ]

  return (
    <section className="relative overflow-hidden border-b border-border bg-mesh">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 size-[28rem] rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 size-[26rem] rounded-full bg-accent/40 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8 lg:py-28">
        <FadeIn className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary backdrop-blur">
            <ShieldCheck className="size-4" />
            {isAr ? "أطباء ومراكز تجميل معتمدون وموثّقون" : "Accredited & Verified Aesthetic Providers"}
          </span>

          <h1 className="text-balance font-heading text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{t.heroTitle}</span>
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t.heroSubtitle}
          </p>

          {/* real search → /search */}
          <form
            action="/search"
            method="get"
            className="flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border bg-card/80 p-2 shadow-elegant backdrop-blur sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 start-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder={t.searchPlaceholder}
                className="h-12 border-0 bg-transparent ps-10 text-base shadow-none focus-visible:ring-0 focus:ring-0"
                aria-label={t.searchPlaceholder}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 gap-2 px-7">
              <Search className="size-5" />
              {tCommon.search}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isAr ? "الأكثر بحثًا:" : "Popular Searches:"}
            </span>
            {quickSearches.map((s) => (
              <Link
                key={s.label}
                href={`/search?q=${encodeURIComponent(s.q)}`}
                className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {isAr ? s.label : s.labelEn}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
            <TrustPoint icon={ShieldCheck} label={isAr ? "تحقّق من التراخيص" : "License Verification"} />
            <TrustPoint icon={FileLock2} label={isAr ? "حماية ملفاتك الطبية" : "Medical File Protection"} />
            <TrustPoint icon={Star} label={isAr ? "تقييمات موثّقة" : "Verified Reviews"} />
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="relative hidden lg:block">
          <div className="relative mx-auto aspect-4/5 w-full max-w-md overflow-hidden rounded-[2.5rem] border border-border shadow-elegant-lg">
            <Image
              src="/hero-clinic.png"
              alt={isAr ? "استشارة تجميلية مع طبيبة معتمدة" : "Aesthetic consultation with an accredited doctor"}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 28rem, 0px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>
          <div className="relative mx-auto -mt-10 grid w-[92%] max-w-md grid-cols-3 gap-2.5">
            {heroHighlights.map((h) => (
              <div
                key={h.title}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/60 bg-card/90 px-2.5 py-4 text-center shadow-elegant-lg backdrop-blur-md transition-all hover:-translate-y-1"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <h.icon className="size-4.5" />
                </span>
                <p className="text-[11px] font-bold leading-tight text-foreground">
                  {h.title}
                </p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {h.desc}
                </p>
              </div>
            ))}
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
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      {label}
    </span>
  )
}
