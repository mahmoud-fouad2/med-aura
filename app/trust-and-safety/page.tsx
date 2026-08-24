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
  { icon: BadgeCheck, title: "اعتماد طبي صارم وتراخيص موثّقة", desc: "نراجع بدقة التراخيص المهنية لكل طبيب ومركز قبل اعتماده، ونراقب صلاحيتها دورياً لضمان أمانكِ الطبي التام." },
  { icon: FileLock2, title: "تشفير تام وحماية قصوى لملفاتكِ", desc: "ملفاتكِ وصوركِ الطبية تُحفظ مشفرة بأحدث بروتوكولات الأمان السحابي، ولا تُعرض إلا بروابط مؤقتة ومحمية بعد موافقتكِ فقط." },
  { icon: CreditCard, title: "مدفوعات آمنة وشفافة", desc: "تتم عمليات الدفع عبر بوابات مشفرة بالكامل ومتوافقة مع المعايير المصرفية العالمية PCI-DSS دون حفظ أي بيانات بطاقات." },
  { icon: Star, title: "تقييمات وتجارب حقيقية موثقة", desc: "نعتمد فقط التقييمات الصادرة عن مراجعين أتمّوا استشاراتهم أو إجراءاتهم فعلياً لضمان الشفافية والمصداقية." },
  { icon: HeartHandshake, title: "رعاية مستمرة ومتابعة بعد الإجراء", desc: "نرافقكِ في فترة التعافي بخطة متابعة مخصصة وتنبيهات دورية وإرشادات طبية تدعم حصولكِ على أفضل النتائج." },
  { icon: ScrollText, title: "سجل أمان وخصوصية دقيق", desc: "نوثق رقمياً كل عملية استعراض لملفكِ الطبي لحماية خصوصيتكِ وضمان حقكِ الكامل في إدارة بياناتكِ." },
]

export const dynamic = "force-dynamic"

export default function TrustAndSafetyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الثقة والأمان"
          title="معايير طبية وتقنية صُممت لراحتكِ واطمئنانكِ"
          subtitle="نضع أمانكِ الطبي وخصوصية بياناتكِ في مقدمة أولوياتنا، ونخضع كل مقدّم خدمة لتدقيق مهني صارم قبل اعتماده."
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
