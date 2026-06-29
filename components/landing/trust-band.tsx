import { BadgeCheck, FileLock2, CreditCard, Star, HeartHandshake } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

const pillars: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: BadgeCheck, title: "تحقق من التراخيص", desc: "نراجع ترخيص كل طبيب ومركز قبل النشر، ونخفيه فور انتهاء صلاحيته." },
  { icon: FileLock2, title: "حماية الصور والملفات", desc: "ملفاتك الطبية خاصة، تُعرض عبر روابط مؤقتة، ولا يطّلع عليها أحد إلا بإذنك." },
  { icon: CreditCard, title: "مدفوعات آمنة", desc: "تتم المدفوعات عبر بوابة آمنة، ولا نخزّن بيانات بطاقتك إطلاقًا." },
  { icon: Star, title: "تقييمات موثّقة", desc: "لا يُسمح بالتقييم إلا بعد استشارة أو إجراء مكتمل فعليًا." },
  { icon: HeartHandshake, title: "متابعة بعد الإجراء", desc: "نرافقك في مرحلة التعافي بخطة متابعة واضحة وتنبيهات عند الحاجة." },
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
              <div className="flex h-full gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-elegant">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <p.icon className="size-6" />
                </span>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
