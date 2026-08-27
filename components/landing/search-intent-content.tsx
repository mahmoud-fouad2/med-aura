import Link from "next/link"
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, ScanSearch, Sparkles } from "lucide-react"
import { localizedPath, type Locale } from "@/lib/i18n/config"

const content = {
  ar: {
    eyebrow: "قرار تجميلي أوضح",
    title: "ابحث عن الطبيب الأنسب، لا عن وعود كبيرة",
    intro:
      "تساعدك Med Aura على مقارنة أطباء ومراكز التجميل وفق معلومات عملية: مجال الخبرة، الموقع، نوع الاستشارة والتقييمات المنشورة. الهدف أن تبدأ بسؤال صحيح وتنتهي بقرار يناسب حالتك وتوقعاتك.",
    items: [
      {
        icon: ScanSearch,
        title: "كيف تختار أفضل طبيب تجميل لاحتياجك؟",
        body: "ابدأ بالإجراء الذي تفكر فيه، ثم راجع خبرة الطبيب وخيارات الاستشارة ومكان تقديم الخدمة قبل الحجز.",
        href: "/doctors",
        cta: "قارن الأطباء",
      },
      {
        icon: BadgeCheck,
        title: "خبرات واضحة ومعلومات تساعد على المقارنة",
        body: "تصفّح الملفات المهنية والإجراءات المتاحة واطرح أسئلتك الطبية مباشرة خلال الاستشارة.",
        href: "/how-it-works",
        cta: "اعرف كيف تعمل المنصة",
      },
      {
        icon: Sparkles,
        title: "خطوات لبشرة أكثر صحة ونضارة",
        body: "تعرّف على خيارات العناية بالبشرة والإجراءات غير الجراحية، ثم ناقش الملاءمة والنتائج المتوقعة مع مختص.",
        href: "/procedures",
        cta: "استكشف الإجراءات",
      },
    ],
  },
  en: {
    eyebrow: "A clearer aesthetic decision",
    title: "Find the right doctor, not a bigger promise",
    intro:
      "Med Aura helps you compare aesthetic doctors and centers using practical details: experience area, location, consultation type, and published reviews. Start with better questions and make a decision suited to your needs and expectations.",
    items: [
      {
        icon: ScanSearch,
        title: "How do you choose the best aesthetic doctor for your needs?",
        body: "Start with the procedure you are considering, then review relevant experience, consultation options, and care location before booking.",
        href: "/doctors",
        cta: "Compare doctors",
      },
      {
        icon: BadgeCheck,
        title: "Clear experience details for useful comparisons",
        body: "Explore professional profiles and available procedures, then ask your medical questions directly during a consultation.",
        href: "/how-it-works",
        cta: "See how Med Aura works",
      },
      {
        icon: Sparkles,
        title: "Steps toward healthier, more radiant skin",
        body: "Learn about skin care and non-surgical options, then discuss suitability and realistic outcomes with a qualified professional.",
        href: "/procedures",
        cta: "Explore procedures",
      },
    ],
  },
} as const

export function SearchIntentContent({ locale }: { locale: Locale }) {
  const copy = content[locale]
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight

  return (
    <section className="border-y border-border/70 bg-background py-14 sm:py-18" aria-labelledby="search-intent-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.7fr] lg:gap-14">
          <div>
            <p className="text-primary text-sm font-bold">{copy.eyebrow}</p>
            <h2 id="search-intent-title" className="font-heading mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">{copy.intro}</p>
          </div>

          <div className="divide-y divide-border/70 border-y border-border/70">
            {copy.items.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.href} className="grid gap-3 py-6 sm:grid-cols-[2.75rem_1fr_auto] sm:items-start sm:gap-5">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                  <Link
                    href={localizedPath(item.href, locale)}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline sm:mt-0.5"
                  >
                    {item.cta}
                    <Arrow className="size-4" aria-hidden="true" />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
