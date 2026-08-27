import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { localizedPath, type Locale } from "@/lib/i18n/config"

const guide = {
  ar: {
    title: "كيف تجد طبيب تجميل مناسبًا لحالتك؟",
    intro: "لا توجد قائمة واحدة تناسب الجميع. الاختيار الأفضل يبدأ بمقارنة المعلومات المرتبطة بالإجراء الذي تفكر فيه، ثم مناقشة حالتك وتوقعاتك في استشارة طبية.",
    points: [
      "راجع خبرة الطبيب في الإجراء المحدد، وليس المسمى العام فقط.",
      "قارن مكان تقديم الرعاية وخيارات المتابعة ونوع الاستشارة المتاح.",
      "اقرأ التقييمات المنشورة باعتبارها تجارب شخصية، لا ضمانًا لنتيجة مماثلة.",
      "اسأل عن البدائل والمخاطر وفترة التعافي والنتائج الواقعية قبل القرار.",
    ],
    title2: "من شد الوجه وتجميل الأنف إلى نضارة البشرة",
    body2: "يمكنك استكشاف الإجراءات الجراحية وغير الجراحية، بما فيها تجميل الأنف، شد الوجه والرقبة، البوتوكس، الفيلر، علاجات البشرة، زراعة الشعر وتصميم الابتسامة. صفحة كل إجراء تشرح فكرته العامة وفترة العودة المتوقعة للروتين لتساعدك على تجهيز أسئلتك للطبيب.",
    cta: "استكشف جميع الإجراءات",
  },
  en: {
    title: "How to find an aesthetic doctor suited to your needs",
    intro: "No single ranking fits everyone. A better choice starts by comparing information relevant to your procedure, then discussing your health, goals, and expectations in a medical consultation.",
    points: [
      "Review experience in the specific procedure, not only a broad specialty label.",
      "Compare care location, follow-up options, and available consultation types.",
      "Treat published reviews as individual experiences, not a promise of the same result.",
      "Ask about alternatives, risks, recovery, and realistic outcomes before deciding.",
    ],
    title2: "From face and neck procedures to healthier-looking skin",
    body2: "Explore surgical and non-surgical options including rhinoplasty, face and neck lift, botulinum toxin, fillers, skin treatments, hair restoration, and smile design. Each procedure page offers an overview and expected return-to-routine range so you can prepare better questions for your doctor.",
    cta: "Explore all procedures",
  },
} as const

export function DoctorDirectoryGuide({ locale }: { locale: Locale }) {
  const copy = guide[locale]
  return (
    <section className="mt-14 border-t border-border/70 pt-10" aria-labelledby="doctor-guide-title">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 id="doctor-guide-title" className="font-heading text-2xl font-bold text-foreground sm:text-3xl">{copy.title}</h2>
          <p className="mt-3 leading-8 text-muted-foreground">{copy.intro}</p>
          <ul className="mt-5 space-y-3">
            {copy.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-7 text-foreground/85">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-s-2 border-primary/25 ps-6 sm:ps-8">
          <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">{copy.title2}</h2>
          <p className="mt-3 leading-8 text-muted-foreground">{copy.body2}</p>
          <Link href={localizedPath("/procedures", locale)} className="mt-6 inline-flex min-h-11 items-center font-bold text-primary hover:underline">
            {copy.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
