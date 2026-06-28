import { PageShell } from "@/components/layout/page-shell"

export const metadata = { title: "سياسة الخصوصية" }

export default function PrivacyPage() {
  return (
    <PageShell
      title="سياسة الخصوصية"
      intro="نلتزم بحماية بياناتك الشخصية والطبية ومعالجتها بأقل قدر ممكن ولأغراض محددة."
    >
      <Section title="البيانات التي نجمعها">
        نجمع بيانات الحساب الأساسية (الاسم، البريد، رقم الهاتف)، وبيانات الحالة
        التجميلية والصور والتقارير التي ترفعها أنت بنفسك عند إنشاء حالة.
      </Section>
      <Section title="كيف نستخدم بياناتك">
        تُستخدم بياناتك لتقديم الخدمة: مطابقتك مع مقدّمي خدمة معتمدين، تمكين
        الاستشارة، وإدارة المواعيد والمدفوعات. لا نبيع بياناتك لأي طرف.
      </Section>
      <Section title="مشاركة الملفات الطبية">
        لا يطّلع أي طبيب على ملفك الطبي إلا بعد منحك إذنًا صريحًا لحالة محددة،
        ويمكنك سحب هذا الإذن في أي وقت. كل اطّلاع أو تنزيل يُسجَّل.
      </Section>
      <Section title="حقوقك">
        يمكنك طلب نسخة من بياناتك أو طلب حذف حسابك. للتواصل بخصوص الخصوصية راسلنا
        عبر قنوات الدعم.
      </Section>
    </PageShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </section>
  )
}
