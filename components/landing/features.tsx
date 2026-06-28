import { Search, ShieldCheck, MessageSquareHeart, Plane } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "ابحث وقارن",
    desc: "تصفّح آلاف العلاجات والأطباء وقارن الأسعار والتقييمات والاعتمادات بسهولة.",
  },
  {
    icon: ShieldCheck,
    title: "اختر بثقة",
    desc: "جميع المراكز والأطباء يخضعون للتحقّق اليدوي من الاعتمادات والتراخيص.",
  },
  {
    icon: MessageSquareHeart,
    title: "تواصل واستشر",
    desc: "أرسل استفسارك مع تقاريرك الطبية واحصل على رد من المركز خلال وقت قصير.",
  },
  {
    icon: Plane,
    title: "سافر وتعالج",
    desc: "نساعدك في تنظيم رحلتك العلاجية من الحجز وحتى المتابعة بعد العلاج.",
  },
]

export function Features() {
  return (
    <section id="how-it-works" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            كيف تعمل منصة MED AURA؟
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            أربع خطوات بسيطة تفصلك عن رعاية طبية موثوقة في الوجهة التي تناسبك.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="h-6 w-6" />
              </span>
              <div>
                <span className="text-sm font-semibold text-accent-foreground/70">
                  {`٠${i + 1}`}
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
