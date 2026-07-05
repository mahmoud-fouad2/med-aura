import {
  BadgeCheck,
  FileLock2,
  CreditCard,
  Star,
  HeartHandshake,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

const pillars: { icon: LucideIcon; title: string; desc: string; hint: string }[] = [
  {
    icon: BadgeCheck,
    title: "تحقق من التراخيص",
    desc: "نراجع ترخيص كل طبيب ومركز قبل النشر، ونخفيه فور انتهاء صلاحيته.",
    hint: "01",
  },
  {
    icon: FileLock2,
    title: "حماية الصور والملفات",
    desc: "ملفاتك الطبية خاصة، تُعرض عبر روابط مؤقتة، ولا يطّلع عليها أحد إلا بإذنك.",
    hint: "02",
  },
  {
    icon: CreditCard,
    title: "مدفوعات آمنة",
    desc: "تتم المدفوعات عبر بوابة آمنة، ولا نخزّن بيانات بطاقتك إطلاقًا.",
    hint: "03",
  },
  {
    icon: Star,
    title: "تقييمات موثّقة",
    desc: "لا يُسمح بالتقييم إلا بعد استشارة أو إجراء مكتمل فعليًا.",
    hint: "04",
  },
  {
    icon: HeartHandshake,
    title: "متابعة بعد الإجراء",
    desc: "نرافقك في مرحلة التعافي بخطة متابعة واضحة وتنبيهات عند الحاجة.",
    hint: "05",
  },
]

export function TrustBand() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="الثقة والأمان"
          title="لماذا Med Aura"
          subtitle="معايير صُممت لتمنحك الطمأنينة في كل خطوة من رحلتك التجميلية."
        />
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <StaggerItem key={p.title}>
              <div className="group relative isolate flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_2px_4px_rgba(20,20,60,0.05),0_12px_28px_-12px_rgba(20,20,60,0.16)]">
                {/* Top gradient accent */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

                {/* Large watermark number in the corner */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-4 -end-2 font-heading text-[110px] font-black leading-none text-primary/[.04] tabular-nums"
                >
                  {p.hint}
                </span>

                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <p.icon className="size-6" />
                  </span>
                  <span className="font-heading text-xs font-semibold tracking-[0.14em] text-primary/70 tabular-nums">
                    {p.hint}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
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
