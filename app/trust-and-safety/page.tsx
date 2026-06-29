import { BadgeCheck, FileLock2, CreditCard, Star, HeartHandshake, ScrollText } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/motion"

export const metadata = {
  title: "الثقة والأمان",
  description:
    "كيف تحمي Med Aura المرضى ومقدّمي الخدمة: التحقق من التراخيص، حماية الملفات الطبية، المدفوعات الآمنة، والتقييمات الموثقة.",
}

const pillars = [
  { icon: BadgeCheck, title: "التحقق من التراخيص", desc: "نراجع ترخيص كل طبيب ومركز قبل النشر، ونخفيه فور انتهاء صلاحيته ونمنع الحجوزات الجديدة." },
  { icon: FileLock2, title: "حماية الصور والملفات", desc: "تُخزَّن ملفاتك الطبية بشكل خاص وتُعرض عبر روابط مؤقتة موقّعة فقط، ولا تُتاح عبر روابط عامة." },
  { icon: CreditCard, title: "مدفوعات آمنة", desc: "تتم عبر بوابة دفع آمنة، ولا نخزّن بيانات بطاقتك، ولا نؤكد الدفع إلا بعد تحقق موثوق." },
  { icon: Star, title: "تقييمات موثّقة", desc: "لا يُسمح بالتقييم إلا بعد استشارة أو إجراء مكتمل فعليًا، مع شارة توثيق واضحة." },
  { icon: HeartHandshake, title: "متابعة بعد الإجراء", desc: "نرافقك في التعافي بخطة متابعة وتنبيهات، مع توجيهك للطوارئ عند الحاجة." },
  { icon: ScrollText, title: "سجل وصول للملفات", desc: "يُسجَّل كل اطّلاع أو تنزيل لأي ملف طبي، لحماية خصوصيتك وضمان المساءلة." },
]

export const dynamic = "force-dynamic"

export default function TrustAndSafetyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الثقة والأمان"
          title="معايير صُممت لطمأنينتك"
          subtitle="نتعامل مع بياناتك الطبية ومدفوعاتك بأعلى درجات الحذر، ونتحقق من كل مقدّم خدمة قبل أن يصل إليك."
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <FeatureGrid items={pillars} />
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="الخصوصية"
                title="أنت من يتحكم في بياناتك"
                subtitle="لا يطّلع أي طبيب على ملفك إلا بعد منحك إذنًا صريحًا لحالة محددة، ويمكنك سحب هذا الإذن في أي وقت. تعرّف أكثر على ممارساتنا في سياسة الخصوصية."
              />
              <div className="mt-8 flex justify-center gap-3">
                <Button render={<Link href="/privacy">سياسة الخصوصية</Link>} />
                <Button variant="outline" render={<Link href="/medical-disclaimer">إخلاء المسؤولية الطبية</Link>} />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
