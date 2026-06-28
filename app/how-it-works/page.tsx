import { PageShell } from "@/components/layout/page-shell"

export const metadata = {
  title: "كيف تعمل المنصة",
  description:
    "تعرّف على رحلتك في Med Aura خطوة بخطوة: من اختيار الإجراء حتى المتابعة بعد العملية.",
}

const steps = [
  ["اختر الإجراء والطبيب", "تصفّح إجراءات التجميل وقارن بين أطباء ومراكز معتمدين ظهروا بعد التحقق من تراخيصهم."],
  ["أنشئ حالتك بأمان", "أجب عن أسئلة الإجراء وارفع صورك وتقاريرك في مساحة خاصة لا يطّلع عليها أحد إلا بإذنك."],
  ["امنح الطبيب صلاحية الاطلاع", "أنت من يقرر مَن يرى ملفك، ويمكنك سحب الإذن في أي وقت."],
  ["احجز الاستشارة وادفع رسومها", "اختر موعدًا متاحًا وادفع رسوم الاستشارة عبر بوابة دفع آمنة."],
  ["راجعة الطبيب وإصدار الخطة", "بعد الاستشارة يصدر الطبيب خطة علاجية، ويُصدر المركز عرض سعر واضحًا."],
  ["تأكيد الإجراء والمتابعة", "بعد الاعتماد الطبي وتأكيد الموعد، تتم العملية وتبدأ خطة المتابعة بعدها."],
]

export default function HowItWorksPage() {
  return (
    <PageShell
      title="كيف تعمل Med Aura"
      intro="نرافقك في كل خطوة من رحلتك التجميلية، مع وضوح في المعلومات وحماية لبياناتك."
    >
      <ol className="space-y-5">
        {steps.map(([title, desc], i) => (
          <li key={title} className="flex gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
              {i + 1}
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </PageShell>
  )
}
