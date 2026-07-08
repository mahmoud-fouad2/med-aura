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

export const metadata = {
  title: "كيف تعمل المنصة",
  description:
    "تعرّف على رحلتك في Med Aura خطوة بخطوة: من اختيار الإجراء حتى المتابعة بعد العملية.",
}

const steps: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Search, title: "اختر الإجراء والطبيب", desc: "تصفّح إجراءات التجميل وقارن بين أطباء ومراكز معتمدين ظهروا بعد التحقق من تراخيصهم." },
  { icon: FileLock2, title: "أنشئ حالتك بأمان", desc: "أجب عن أسئلة الإجراء وارفع صورك وتقاريرك في مساحة خاصة لا يطّلع عليها أحد إلا بإذنك." },
  { icon: ShieldCheck, title: "امنح الطبيب صلاحية الاطلاع", desc: "أنت من يقرر مَن يرى ملفك، ويمكنك سحب الإذن في أي وقت." },
  { icon: CalendarCheck, title: "احجز الاستشارة وادفع رسومها", desc: "اختر موعدًا متاحًا وادفع رسوم الاستشارة عبر بوابة دفع آمنة." },
  { icon: ClipboardList, title: "مراجعة الطبيب وإصدار الخطة", desc: "بعد الاستشارة يصدر الطبيب خطة علاجية، ويُصدر المركز عرض سعر واضحًا." },
  { icon: HeartHandshake, title: "تأكيد الإجراء والمتابعة", desc: "بعد الاعتماد الطبي وتأكيد الموعد، تتم العملية وتبدأ خطة المتابعة بعدها." },
]

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="رحلة واضحة"
          title="كيف تعمل Med Aura"
          subtitle="نرافقك في كل خطوة من رحلتك التجميلية، مع وضوح في المعلومات وحماية لبياناتك."
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, i) => (
                <StaggerItem key={step.title}>
                  <div className="relative flex h-full flex-col gap-4.5 rounded-2xl border border-white/60 bg-card/85 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/45 hover:shadow-elegant-lg backdrop-blur-sm">
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
