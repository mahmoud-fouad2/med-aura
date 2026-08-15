import {
  BadgeCheck,
  FileLock2,
  CreditCard,
  Star,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import type { Locale } from "@/lib/i18n"

const pillars: { icon: LucideIcon; title: string; titleEn: string; desc: string; descEn: string }[] = [
  {
    icon: Star,
    title: "تقييمات موثوقة",
    titleEn: "Verified reviews",
    desc: "آراء حقيقية من مرضى أكملوا تجربتهم داخل المنصة.",
    descEn: "Reviews from patients who completed their journey on the platform.",
  },
  {
    icon: CreditCard,
    title: "مدفوعات آمنة",
    titleEn: "Secure payments",
    desc: "خيارات دفع واضحة ومحمية قبل تثبيت أي موعد.",
    descEn: "Clear, protected payment options before confirming an appointment.",
  },
  {
    icon: FileLock2,
    title: "حماية الصور والملفات",
    titleEn: "Private files",
    desc: "صورك وتقاريرك تبقى خاصة، ولا تُشارك إلا ضمن رحلتك العلاجية.",
    descEn: "Your photos and reports stay private and are shared only for your care.",
  },
  {
    icon: BadgeCheck,
    title: "تحقق من الترخيص",
    titleEn: "License checks",
    desc: "نراجع بيانات الطبيب أو المركز قبل ظهوره للمرضى.",
    descEn: "Provider credentials are reviewed before profiles are published.",
  },
]

export function TrustBand({ locale }: { locale: Locale }) {
  const isAr = locale === "ar"
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          align="start"
          eyebrow={isAr ? "الثقة والأمان" : "Trust & safety"}
          title={isAr ? "لماذا Med Aura" : "Why Med Aura"}
          subtitle={isAr ? "قرار أوضح، وبيانات محمية، وتجربة أكثر طمأنينة." : "Clearer decisions, protected data, and a more reassuring experience."}
        />
        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <StaggerItem key={p.title}>
              <div className="group relative isolate flex h-full items-start gap-4 overflow-hidden rounded-xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-elegant">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold/14 ring-1 ring-gold/25 transition-transform duration-300 group-hover:scale-105">
                  <p.icon className="size-7 text-gold" />
                </span>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {isAr ? p.title : p.titleEn}
                  </h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {isAr ? p.desc : p.descEn}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
