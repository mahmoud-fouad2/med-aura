import { Users, CalendarCheck, ShieldCheck, Wallet, LineChart, FileCheck2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

export const metadata = {
  title: "انضم كطبيب",
  description:
    "انضم إلى Med Aura كطبيب تجميل معتمد، واعرض خدماتك أمام مرضى موثوقين، وأدِر استشاراتك وحالاتك بكفاءة.",
}

const benefits = [
  { icon: Users, title: "مراجعون جادّون وباحثون عن التميز", desc: "تواصَل مع مراجعين يبحثون عن استشارات وخدمات تجميلية متخصصة وموثوقة." },
  { icon: CalendarCheck, title: "إدارة ذكية للمواعيد والاستشارات", desc: "نظّم جدول استشاراتك المرئية والحضورية بكل مرونة عبر واجهة تقويم متطورة." },
  { icon: FileCheck2, title: "ملفات طبية منظّمة ومشفرة", desc: "استقبل ملفات الحالات بالصور والتقارير الطبية المنظمة والمشفرة قبل موعد اللقاء." },
  { icon: ShieldCheck, title: "اعتماد رسمي وشارة موثّقة", desc: "شارة توثيق مهنية تعزز ثقة المراجعين بخبراتك وتراخيصك الطبية المعتمدة." },
  { icon: Wallet, title: "تحصيل مالي آمن وتقارير شفافة", desc: "تحصيل فوري لرسوم الاستشارات والعرابين عبر بوابات دفع مصرفية آمنة وموثوقة." },
  { icon: LineChart, title: "واجهة مهنية راقية تبرز خبرتك", desc: "ملف تعريفي فاخر يعكس مؤهلاتك، سنوات خبرتك، وأبرز إجراءاتك وتقييمات مراجعيك." },
]

const steps = [
  "أنشئ حسابك الطبي على المنصة بسهولة.",
  "قدّم طلب الانضمام والاعتماد المهني مع إرفاق التراخيص الرسمية والبيانات التخصصية.",
  "يراجع فريق التدقيق والامتثال الطبي طلبك للتحقق من سريان التراخيص والمؤهلات.",
  "فور الاعتماد، يُنشر ملفك المهني الموثّق لتبدأ في استقبال الاستشارات والحالات فوراً.",
]

export const dynamic = "force-dynamic"

export default function ForDoctorsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="لمقدّمي الخدمة"
          title="انضم إلى Med Aura كطبيب تجميل"
          subtitle="اعرض خبرتك أمام مرضى يبحثون عن رعاية موثوقة، وأدِر رحلتهم من الاستشارة حتى المتابعة — بعد التحقق من ترخيصك."
          primary={{ href: "/sign-up?type=doctor", label: "ابدأ طلب الانضمام" }}
          secondary={{ href: "/how-it-works", label: "كيف تعمل المنصة" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="المزايا" title="لماذا تنضم إلينا" />
            <div className="mt-12">
              <FeatureGrid items={benefits} />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="الانضمام" title="خطوات بسيطة للبدء" align="start" />
            <Stagger className="mt-10 space-y-4">
              {steps.map((s, i) => (
                <StaggerItem key={i}>
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-foreground">{s}</p>
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
