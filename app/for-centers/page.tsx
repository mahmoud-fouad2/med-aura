import { Building2, Users, CalendarRange, ShieldCheck, Wallet, ClipboardList } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion"

export const metadata = {
  title: "سجّل مركزك",
  description:
    "سجّل مركز التجميل الخاص بك على Med Aura: أدِر فريقك وأطباءك ومواعيدك وحجوزاتك ضمن منصة موثوقة.",
}

const benefits = [
  { icon: Users, title: "إدارة الفريق", desc: "أضف أطباءك وموظفيك بصلاحيات منظّمة ضمن مركزك." },
  { icon: CalendarRange, title: "مواعيد وحجوزات", desc: "نظّم جداول الأطباء والإجراءات والحجوزات في لوحة واحدة." },
  { icon: ClipboardList, title: "حالات وعروض أسعار", desc: "استقبل الحالات وأصدر عروض الأسعار بالتنسيق مع أطبائك." },
  { icon: ShieldCheck, title: "اعتماد موثّق", desc: "بعد التحقق من تراخيص المنشأة يظهر مركزك بشارة توثيق." },
  { icon: Wallet, title: "مدفوعات وفواتير", desc: "تتبّع المدفوعات والفواتير والمستردات بشفافية." },
  { icon: Building2, title: "حضور احترافي", desc: "صفحة مركز راقية تبرز خدماتك وأطباءك ومرافقك." },
]

export const dynamic = "force-dynamic"

export default function ForCentersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="لمراكز التجميل"
          title="سجّل مركزك على Med Aura"
          subtitle="منصة متكاملة لإدارة أطبائك ومواعيدك وحالاتك وحجوزاتك، مع حضور موثوق أمام مرضى يبحثون عن رعاية تجميلية."
          primary={{ href: "/for-centers/apply", label: "سجّل مركزك" }}
          secondary={{ href: "/for-doctors", label: "أنت طبيب؟" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="المزايا" title="أدوات تدير مركزك بكفاءة" />
            <div className="mt-12">
              <FeatureGrid items={benefits} />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="الاعتماد"
                title="نتحقق قبل النشر"
                subtitle="نراجع السجل التجاري وترخيص المنشأة قبل تفعيل مركزك، حفاظًا على ثقة المرضى. تواصل معنا لبدء عملية التسجيل والاعتماد."
              />
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
