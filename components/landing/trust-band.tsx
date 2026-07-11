import {
  BadgeCheck,
  FileLock2,
  CreditCard,
  Star,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

const pillars: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Star,
    title: "تقييمات موثوقة",
    desc: "آراء حقيقية من مرضى أكملوا تجربتهم داخل المنصة.",
  },
  {
    icon: CreditCard,
    title: "مدفوعات آمنة",
    desc: "خيارات دفع واضحة ومحمية قبل تثبيت أي موعد.",
  },
  {
    icon: FileLock2,
    title: "حماية الصور والملفات",
    desc: "صورك وتقاريرك تبقى خاصة، ولا تُشارك إلا ضمن رحلتك العلاجية.",
  },
  {
    icon: BadgeCheck,
    title: "تحقق من الترخيص",
    desc: "نراجع بيانات الطبيب أو المركز قبل ظهوره للمرضى.",
  },
]

export function TrustBand() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          align="start"
          eyebrow="الثقة والأمان"
          title="لماذا Med Aura"
          subtitle="نختصر لك الطريق إلى قرار أوضح، مع حماية لبياناتك وتجربة أكثر طمأنينة."
        />
        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <StaggerItem key={p.title}>
              <div className="group relative isolate flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-white/70 bg-card/86 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-elegant-lg backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold/14 ring-1 ring-gold/25 transition-transform duration-300 group-hover:scale-105">
                  <p.icon className="size-7 text-gold" />
                </span>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {p.desc}
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
