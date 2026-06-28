import { PageShell } from "@/components/layout/page-shell"

export const metadata = { title: "إخلاء المسؤولية الطبية" }

export default function MedicalDisclaimerPage() {
  return (
    <PageShell title="إخلاء المسؤولية الطبية">
      <p className="text-muted-foreground">
        المعلومات المعروضة على Med Aura لأغراض تعريفية ولا تُعد تشخيصًا أو نصيحة
        طبية. أي قرار يتعلق بإجراء تجميلي يجب أن يُتخذ بعد استشارة طبيب مختص
        وتقييم حالتك الفردية.
      </p>
      <p className="text-muted-foreground">
        في حال ظهور أعراض طارئة بعد أي إجراء، تواصل فورًا مع طبيبك أو أقرب جهة
        طوارئ. لا تعتمد على المنصة كبديل عن الرعاية الطارئة.
      </p>
      <p className="text-muted-foreground">
        تختلف النتائج من شخص لآخر، ولا تقدّم المنصة أو مقدّمو الخدمة أي ضمان
        لنتيجة محددة.
      </p>
    </PageShell>
  )
}
