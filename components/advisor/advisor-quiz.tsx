"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowLeft, CheckCircle2, ChevronRight, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FadeIn, Reveal } from "@/components/motion"

type Step = 0 | 1 | 2 | 3

// Each area maps to a real /search?category= slug (components/landing/cosmetic-areas.tsx)
// so the "recommended doctors" button actually filters, instead of landing on
// unfiltered /search regardless of what was answered.
const AREAS = [
  { label: "الوجه والأنف", slug: "face-neck" },
  { label: "نحت وتنسيق القوام", slug: "body" },
  { label: "العناية بالبشرة والحقن", slug: "skin" },
  { label: "زراعة وعلاج الشعر", slug: "hair" },
] as const

export function AdvisorQuiz() {
  const [step, setStep] = useState<Step>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})

  const handleAnswer = (key: string, value: string, label: string) => {
    setAnswers({ ...answers, [key]: value })
    setLabels({ ...labels, [key]: label })
    if (step < 3) setStep((s) => (s + 1) as Step)
  }

  const resultsHref = `/search?category=${answers.area ?? ""}&surgical=${answers.type ?? ""}`

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center">
      {step === 0 && (
        <FadeIn className="text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-8" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl mb-4">
            المستشار التجميلي الذكي
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            لا تعرفين من أين تبدئين؟ أجيبي عن 3 أسئلة بسيطة لنرتّب لكِ خيارات البحث المناسبة حسب المنطقة ونوع الإجراء.
          </p>
          <Button size="lg" className="rounded-xl shadow-md text-base h-14 px-8" onClick={() => setStep(1)}>
            ابدئي التقييم الآن
            <ArrowLeft className="ml-2 size-5" />
          </Button>
        </FadeIn>
      )}

      {step === 1 && (
        <FadeIn key="step1">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">1. ما هي المنطقة التي ترغبين بتحسينها؟</h2>
            <span className="text-sm font-bold text-muted-foreground">الخطوة 1 من 3</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AREAS.map((option) => (
              <Card
                key={option.slug}
                className="p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all rounded-2xl border-border/80 text-center"
                onClick={() => handleAnswer("area", option.slug, option.label)}
              >
                <h3 className="font-bold text-lg">{option.label}</h3>
              </Card>
            ))}
          </div>
        </FadeIn>
      )}

      {step === 2 && (
        <FadeIn key="step2">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">2. هل تفضلين إجراءً جراحياً أم غير جراحي؟</h2>
            <span className="text-sm font-bold text-muted-foreground">الخطوة 2 من 3</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card
              className="p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all rounded-2xl border-border/80 flex items-center justify-between"
              onClick={() => handleAnswer("type", "true", "جراحي")}
            >
              <div>
                <h3 className="font-bold text-lg mb-1">تدخل جراحي (نتائج جذرية)</h3>
                <p className="text-sm text-muted-foreground">تتطلب تخدير وفترة نقاهة (مثل عمليات التجميل الجراحية).</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
            <Card
              className="p-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all rounded-2xl border-border/80 flex items-center justify-between"
              onClick={() => handleAnswer("type", "false", "غير جراحي")}
            >
              <div>
                <h3 className="font-bold text-lg mb-1">إجراء غير جراحي (نتائج سريعة)</h3>
                <p className="text-sm text-muted-foreground">لا تتطلب فترة نقاهة طويلة (مثل الفيلر، الليزر، الخيوط).</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </div>
        </FadeIn>
      )}

      {step === 3 && (
        <Reveal key="step3" className="text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success/20 text-success">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-3">لقد وجدنا الخيارات الأنسب لكِ!</h2>
          <p className="text-muted-foreground mb-8">
            بناءً على اختياركِ ({labels.area} - {labels.type})، جهّزنا نتائج البحث المطابقة لتراجعي الملفات المتاحة بنفسكِ.
          </p>

          <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-sm mb-8 text-right">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              الإجراءات المقترحة:
            </h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> مراجعة خيارات {labels.area} ({labels.type})</li>
              <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> استشارة أولية مع استشاري متخصص</li>
            </ul>
            <Button className="w-full rounded-xl" size="lg" render={<Link href={resultsHref}>تصفّح النتائج المطابقة</Link>} />
          </div>

          <Button variant="ghost" onClick={() => { setStep(0); setAnswers({}); setLabels({}) }}>
            إعادة التقييم
          </Button>
        </Reveal>
      )}
    </div>
  )
}
