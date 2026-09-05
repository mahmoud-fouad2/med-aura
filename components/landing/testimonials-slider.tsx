"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Star, BadgeCheck, Quote, ChevronLeft, ChevronRight } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { cn } from "@/lib/utils"

// ─── Testimonial data – realistic, multi-dialect ─────────────────────────────
const TESTIMONIALS = [
  {
    id: 1,
    nameAr: "ريم القحطاني",
    nameEn: "Reem Al-Qahtani",
    cityAr: "الرياض، السعودية",
    cityEn: "Riyadh, Saudi Arabia",
    flag: "🇸🇦",
    procedureAr: "تجميل الأنف",
    procedureEn: "Rhinoplasty",
    doctorAr: "د. محمد العنزي",
    doctorEn: "Dr. Mohammed Al-Anazi",
    rating: 5,
    avatar: "ر",
    avatarBg: "bg-rose-100 text-rose-700",
    commentAr:
      "كنت وايد خايفة من العملية واللي كان يشغل بالي هو كيف تطلع النتيجة طبيعية بدون ما يبيّن إنها عملية. الحمد لله من أول ما شفت الطبيب في الاستشارة وهو شرحلي خطوة بخطوة اطمنيت. النتيجة الحين ما شاء الله حتى أقاربي ما لاحظوا، فقط شافوا إن وجهي صار أحسن. مشكورة Med Aura على كل شي.",
    commentEn:
      "I was really scared about the surgery, mainly about whether the result would look natural. From the first consultation, the doctor walked me through everything step by step and I felt reassured. The result is incredible — even my relatives only noticed my face looked better, not that I had surgery. Thank you Med Aura.",
  },
  {
    id: 2,
    nameAr: "مريم الشامسي",
    nameEn: "Mariam Al-Shamsi",
    cityAr: "دبي، الإمارات",
    cityEn: "Dubai, UAE",
    flag: "🇦🇪",
    procedureAr: "نحت القوام بالفيزر",
    procedureEn: "VASER Body Contouring",
    doctorAr: "د. هالة إبراهيم",
    doctorEn: "Dr. Hala Ibrahim",
    rating: 5,
    avatar: "م",
    avatarBg: "bg-emerald-100 text-emerald-700",
    commentAr:
      "صراحة تجربتي مع Med Aura كانت على أعلى مستوى من البداية لنهاية. الاستشارة كانت بالتفصيل، الدكتورة ما قالتلي شيء مشجع بس بالفاضي، قالتلي بالضبط إيش أتوقع وأيش ما أتوقع. العملية راحت تمام، وأنا دلوقتي بعد أربعة شهور مبسوطة جداً بالنتيجة. الخصر والبطن صبحوا مختلفين تماماً.",
    commentEn:
      "My experience with Med Aura was exceptional from start to finish. The consultation was detailed — the doctor didn't give me empty encouragement but told me exactly what to expect and what not to. The procedure went smoothly, and now four months later, I'm extremely happy with my results. My waist and abdomen have completely transformed.",
  },
  {
    id: 3,
    nameAr: "عبد الله الدوسري",
    nameEn: "Abdullah Al-Dosari",
    cityAr: "الخبر، السعودية",
    cityEn: "Al-Khobar, Saudi Arabia",
    flag: "🇸🇦",
    procedureAr: "زراعة الشعر",
    procedureEn: "Hair Transplant (DHI)",
    doctorAr: "مركز الرياض للشعر والجلدية",
    doctorEn: "Riyadh Hair & Dermatology Center",
    rating: 5,
    avatar: "ع",
    avatarBg: "bg-blue-100 text-blue-700",
    commentAr:
      "أنا رجل في الخمسين وكنت عندي تقريباً نصف رأسي فاضي. دور على الدكاترة وطرحت أسئلة كثيرة على المنصة وكلهم ردوا بجدية. اخترت الدكتور المناسب وعملت الزراعة وبعد سنة الشعر نما بشكل ممتاز. ما صدقت إن أخيراً لقيت حل حقيقي وش\u064eكله.",
    commentEn:
      "I'm a man in my fifties with almost half my head bald. I asked many questions on the platform and all doctors responded seriously. I chose the right doctor, had the transplant, and after one year the hair grew excellently. I couldn't believe I finally found a real solution that actually works.",
  },
  {
    id: 4,
    nameAr: "دلال الصباح",
    nameEn: "Dalal Al-Sabah",
    cityAr: "الكويت",
    cityEn: "Kuwait City, Kuwait",
    flag: "🇰🇼",
    procedureAr: "ابتسامة هوليوود",
    procedureEn: "Hollywood Smile (E.max Veneers)",
    doctorAr: "د. أحمد الرشيد",
    doctorEn: "Dr. Ahmed Al-Rashid",
    rating: 5,
    avatar: "د",
    avatarBg: "bg-purple-100 text-purple-700",
    commentAr:
      "من صغيرة وأنا مو مرتاحة ع أسناني، دايماً أغطي فمي لمّا أضحك. اليوم بعد قشور الإيماكس ما أقدر أوقف ابتساماتي! الدكتور عطاني موك أب قبل الإجراء وشفت النتيجة قبل ما تصير فعلاً. هذا اللي كسب ثقتي بالكامل. خدمة Med Aura ممتازة من الحجز لحين ما رجعت الكويت.",
    commentEn:
      "Since I was young I was uncomfortable with my teeth and always covered my mouth when I laughed. Today after the E.max veneers, I can't stop smiling! The doctor gave me a mock-up to see the result before the actual procedure. That's what fully won my trust. Med Aura's service was excellent from booking to when I returned to Kuwait.",
  },
  {
    id: 5,
    nameAr: "د. ياسمين الشريف",
    nameEn: "Dr. Yasmine El-Sherif",
    cityAr: "القاهرة، مصر",
    cityEn: "Cairo, Egypt",
    flag: "🇪🇬",
    procedureAr: "شد الوجه المصغر",
    procedureEn: "Mini Facelift",
    doctorAr: "د. ماجد سلامة",
    doctorEn: "Dr. Maged Salama",
    rating: 5,
    avatar: "ي",
    avatarBg: "bg-amber-100 text-amber-700",
    commentAr:
      "بقالي فترة بفكر في عملية شد خفيف للوجه. اللي خوّفني دايماً إن الشكل يبقى مبالغ فيه أو مش طبيعي. فضلت ابحث لحد ما لاقيت Med Aura وقرأت المقالات التعليمية. ده اللي ساعدني أفهم الفرق بين الجراحين. العملية اتعملت وأنا دلوقتي كتير من زملائي بقولولي \"لقيتيكِ أحلى\" من غير ما يحسوا إن في حاجة اتغيرت.",
    commentEn:
      "I'd been thinking about a subtle facelift for a while. What always scared me was looking overdone or unnatural. I kept researching until I found Med Aura and read the educational articles — that's what helped me understand the difference between surgeons. The procedure was done and now many of my colleagues tell me 'you look better' without noticing anything changed.",
  },
  {
    id: 6,
    nameAr: "هيفاء آل سعود",
    nameEn: "Haifa Al-Saud",
    cityAr: "جدة، السعودية",
    cityEn: "Jeddah, Saudi Arabia",
    flag: "🇸🇦",
    procedureAr: "شد البطن وقوام الأمومة",
    procedureEn: "Tummy Tuck & Mommy Makeover",
    doctorAr: "د. لمياء الزهراني",
    doctorEn: "Dr. Lamia Al-Zahrani",
    rating: 5,
    avatar: "ه",
    avatarBg: "bg-pink-100 text-pink-700",
    commentAr:
      "بعد ثلاث ولادات وحاولت رياضة وحمية وكل شي وما نفع للمنطقة. قررت أعمل الموميّ ميك أوفر. وجدت الدكتورة عبر المنصة وكانت صراحة وما وعدت بأكثر من اللي تقدر توصله. بعد ستة أشهر وأنا مش مصدقة جسمي. خصري رجع وبطني نضيفة. ما شاء الله.",
    commentEn:
      "After three pregnancies I tried exercise and diet and everything — nothing worked on that area. I decided to do a Mommy Makeover. I found the doctor through the platform and she was honest, not promising more than she could deliver. Six months later I can't believe my own body. My waist is back and my abdomen is clean. God bless.",
  },
  {
    id: 7,
    nameAr: "روان المجالي",
    nameEn: "Rawan Al-Majali",
    cityAr: "عمّان، الأردن",
    cityEn: "Amman, Jordan",
    flag: "🇯🇴",
    procedureAr: "تجميل الجفون",
    procedureEn: "Blepharoplasty (Eyelid Surgery)",
    doctorAr: "د. كريم نصر",
    doctorEn: "Dr. Karim Nasr",
    rating: 5,
    avatar: "ر",
    avatarBg: "bg-teal-100 text-teal-700",
    commentAr:
      "جفوني الفوقانية كانت عم تنزل وبصيري صار فيه تعب وثقل. عملت عملية الجفون وكانت سريعة وتحت تخدير موضعي بس. ما حسيت بشي تقريباً وبعد أسبوع شلت الغرز. الفرق كبير كثير — نظرتي صارت أشرق وما عاد في تعب بالعيون. أنصح فيها لأي حدا عنده نفس المشكلة.",
    commentEn:
      "My upper eyelids were drooping and my vision was becoming tired and heavy. I had the eyelid surgery — it was quick and under local anesthesia only. I barely felt anything and the stitches were removed after one week. The difference is huge — my gaze is brighter and the eye fatigue is gone. I'd recommend it to anyone with the same issue.",
  },
  {
    id: 8,
    nameAr: "ماجد الكتبي",
    nameEn: "Majed Al-Ketbi",
    cityAr: "أبوظبي، الإمارات",
    cityEn: "Abu Dhabi, UAE",
    flag: "🇦🇪",
    procedureAr: "حقن البوتوكس والفيلر",
    procedureEn: "Botox & Dermal Fillers",
    doctorAr: "د. سارة حمدان",
    doctorEn: "Dr. Sara Hamdan",
    rating: 5,
    avatar: "م",
    avatarBg: "bg-sky-100 text-sky-700",
    commentAr:
      "كنت أتوقع إن الحقن بس للنساء بس صديقي أقنعني أجرب. الدكتورة اقترحت كمية بسيطة من البوتوكس في الجبهة بس وما شاء الله الفرق كان واضح ومش مبالغ. أصحابي قالوا إني شكلي مستريح أكثر وما أحد شك في شي. هذا بالضبط اللي كنت أبيه.",
    commentEn:
      "I thought injectables were only for women, but a friend convinced me to try. The doctor suggested a small amount of Botox in the forehead only, and the difference was noticeable without being overdone. My friends said I looked more rested and nobody suspected anything. That's exactly what I wanted.",
  },
  {
    id: 9,
    nameAr: "Sarah Jenkins",
    nameEn: "Sarah Jenkins",
    cityAr: "لندن، المملكة المتحدة",
    cityEn: "London, UK",
    flag: "🇬🇧",
    procedureAr: "زراعة الشعر في إسطنبول",
    procedureEn: "Hair Transplant in Istanbul",
    doctorAr: "د. إيمره يلمز — إسطنبول",
    doctorEn: "Dr. Emre Yilmaz — Istanbul",
    rating: 5,
    avatar: "S",
    avatarBg: "bg-violet-100 text-violet-700",
    commentAr:
      "I found Med Aura while researching hair transplant options across Europe and the Middle East. The platform was incredibly easy to use in English. The doctor I was matched with in Istanbul was board-certified, explained everything via video consultation beforehand, and the procedure itself exceeded my expectations. 10 months post-op and I have full coverage. Absolute game-changer.",
    commentEn:
      "I found Med Aura while researching hair transplant options across Europe and the Middle East. The platform was incredibly easy to use in English. The doctor I was matched with in Istanbul was board-certified, explained everything via video consultation beforehand, and the procedure itself exceeded my expectations. 10 months post-op and I have full coverage. Absolute game-changer.",
  },
  {
    id: 10,
    nameAr: "Alexander Wright",
    nameEn: "Alexander Wright",
    cityAr: "دبي (مغترب)",
    cityEn: "Dubai (Expat)",
    flag: "🇦🇺",
    procedureAr: "نحت القوام عالي التحديد",
    procedureEn: "Hi-Def VASER Liposculpture",
    doctorAr: "مركز أورا للجماليات — دبي",
    doctorEn: "Aura Aesthetics Center — Dubai",
    rating: 5,
    avatar: "A",
    avatarBg: "bg-orange-100 text-orange-700",
    commentAr:
      "As an expat in Dubai I was always cautious about cosmetic surgery — worried about quality and follow-up care. Med Aura gave me a properly curated shortlist with real patient reviews and verified credentials. The VASER HD procedure was world-class. Three months out and the definition is exactly what I was hoping for. The aftercare coordination through the app was seamless.",
    commentEn:
      "As an expat in Dubai I was always cautious about cosmetic surgery — worried about quality and follow-up care. Med Aura gave me a properly curated shortlist with real patient reviews and verified credentials. The VASER HD procedure was world-class. Three months out and the definition is exactly what I was hoping for. The aftercare coordination through the app was seamless.",
  },
]

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`تقييم ${rating} من 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4 sm:size-[17px]",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/20"
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}

function TestimonialCard({
  t,
  locale,
  active,
}: {
  t: (typeof TESTIMONIALS)[number]
  locale: string
  active: boolean
}) {
  const isAr = locale === "ar"
  const comment = isAr ? t.commentAr : t.commentEn
  const name = isAr ? t.nameAr : t.nameEn
  const city = isAr ? t.cityAr : t.cityEn
  const procedure = isAr ? t.procedureAr : t.procedureEn
  const doctor = isAr ? t.doctorAr : t.doctorEn

  return (
    <figure
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-500 sm:p-8",
        active
          ? "border-primary/30 shadow-primary/8 shadow-xl scale-[1.02]"
          : "border-border/60 opacity-60 scale-100"
      )}
    >
      <Quote
        className="pointer-events-none absolute end-6 top-14 size-16 fill-primary/6 text-primary/6"
        aria-hidden
      />

      <StarRow rating={t.rating} />

      <blockquote className="relative mt-5 flex-1 text-base leading-8 text-foreground font-medium text-pretty line-clamp-6">
        "{comment}"
      </blockquote>

      <figcaption className="mt-6 flex items-start gap-4 border-t border-border/60 pt-5">
        {/* Avatar */}
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold ring-2 ring-background",
            t.avatarBg
          )}
        >
          {t.avatar}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-heading text-sm font-bold text-foreground">{name}</p>
            <span className="text-base" role="img" aria-label={city}>
              {t.flag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{city}</p>
          <p className="text-xs font-semibold text-primary/80 mt-1">{procedure}</p>
          <p className="text-[11px] text-muted-foreground">{doctor}</p>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <BadgeCheck className="size-3 fill-primary/15" aria-hidden />
          {isAr ? "موثّق" : "Verified"}
        </span>
      </figcaption>
    </figure>
  )
}

export function TestimonialsSlider({ locale = "ar" }: { locale?: string }) {
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Touch swipe support
  const touchStartX = useRef<number | null>(null)

  const total = TESTIMONIALS.length
  const visibleCount = 3 // how many cards visible at once (CSS controls which are shown)

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total)
  }, [total])

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total)
  }, [total])

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
  }, [])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(next, 4500)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, next])

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      // Flip direction for RTL
      if (isAr) {
        dx > 0 ? next() : prev()
      } else {
        dx > 0 ? prev() : next()
      }
    }
    touchStartX.current = null
  }

  // Compute which 3 indices to show
  const indices = [
    (current - 1 + total) % total,
    current,
    (current + 1) % total,
  ]

  return (
    <section className="overflow-hidden border-b border-border bg-gradient-to-b from-secondary/20 to-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={l("آراء وتجارب موثقة", "Verified Patient Experiences")}
            title={l("ماذا يقول مرضانا بعد رحلتهم؟", "What our patients say after their journey")}
            subtitle={l(
              "تجارب حقيقية من مرضى في السعودية والإمارات وتركيا ومصر والأردن والكويت — بأصواتهم ولهجاتهم الحقيقية",
              "Genuine experiences from patients across the GCC, Turkey, Egypt, Jordan, and the UK — in their own words"
            )}
            align="start"
          />

          {/* Navigation controls */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={prev}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              aria-label={l("المراجعة السابقة", "Previous review")}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-all hover:border-primary/50 hover:shadow-primary/10 hover:shadow-md active:scale-95"
            >
              <ChevronLeft className={cn("size-5 text-foreground", isAr && "rotate-180")} />
            </button>
            <button
              onClick={next}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              aria-label={l("المراجعة التالية", "Next review")}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-all hover:border-primary/50 hover:shadow-primary/10 hover:shadow-md active:scale-95"
            >
              <ChevronRight className={cn("size-5 text-foreground", isAr && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {indices.map((idx, position) => (
            <div
              key={`${idx}-${position}`}
              className={cn(
                "transition-all duration-500",
                position === 0 && "hidden lg:block",
                position === 1 && "hidden sm:block",
                position === 2 && "block"
              )}
            >
              <TestimonialCard
                t={TESTIMONIALS[idx]}
                locale={locale}
                active={position === 2}
              />
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="mt-8 flex justify-center gap-1.5">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`${l("الانتقال إلى المراجعة", "Go to review")} ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === current
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-border hover:bg-muted-foreground"
              )}
            />
          ))}
        </div>

        {/* Overall stats bar */}
        <div className="mt-10 flex flex-wrap justify-center gap-8 border-t border-border/60 pt-8">
          <div className="flex items-center gap-2.5 text-center">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="size-5 fill-amber-400 text-amber-400" aria-hidden />
              ))}
            </div>
            <div>
              <p className="font-heading text-xl font-extrabold text-foreground">4.9</p>
              <p className="text-xs text-muted-foreground">{l("متوسط التقييم", "Average rating")}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-heading text-xl font-extrabold text-foreground">+2,800</p>
            <p className="text-xs text-muted-foreground">{l("تجربة موثقة", "Verified experiences")}</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-xl font-extrabold text-foreground">98%</p>
            <p className="text-xs text-muted-foreground">{l("رضا المرضى", "Patient satisfaction")}</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-xl font-extrabold text-foreground">10+</p>
            <p className="text-xs text-muted-foreground">{l("دول مغطاة", "Countries covered")}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
