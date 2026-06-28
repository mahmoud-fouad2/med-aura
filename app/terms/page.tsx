import { PageShell } from "@/components/layout/page-shell"

export const metadata = { title: "الشروط والأحكام" }

export default function TermsPage() {
  return (
    <PageShell
      title="الشروط والأحكام"
      intro="باستخدامك Med Aura فإنك توافق على الشروط التالية."
    >
      <Section title="دور المنصة">
        Med Aura منصة تربط المرضى بأطباء ومراكز تجميل معتمدين وتدير رحلة الخدمة.
        المنصة ليست مقدّم رعاية طبية، والقرار الطبي مسؤولية الطبيب المعالج.
      </Section>
      <Section title="الحسابات">
        التسجيل العام ينشئ حساب مريض فقط. ينضم الأطباء والمراكز عبر طلب يخضع
        للمراجعة والتحقق من التراخيص قبل الاعتماد.
      </Section>
      <Section title="الحجوزات والمدفوعات">
        لا يُعتمد الإجراء نهائيًا إلا بعد الاستشارة والاعتماد الطبي وقبول عرض
        السعر وسداد المبالغ المطلوبة وتأكيد المركز للموعد.
      </Section>
      <Section title="المحتوى">
        لا يُسمح بنشر ادعاءات مضلّلة مثل «نتائج مضمونة» أو «بدون مخاطر». يخضع
        المحتوى للمراجعة عند الحاجة.
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
