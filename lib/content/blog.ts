import type { Locale } from "@/lib/i18n/config"

export type BlogSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type LocalizedBlogPost = {
  slug: string
  image: string
  publishedAt: string
  reviewedAt: string
  readingMinutes: number
  title: string
  description: string
  category: string
  sections: BlogSection[]
}

type BlogPost = Omit<LocalizedBlogPost, "title" | "description" | "category" | "sections"> & {
  ar: Pick<LocalizedBlogPost, "title" | "description" | "category" | "sections">
  en: Pick<LocalizedBlogPost, "title" | "description" | "category" | "sections">
}

const POSTS: BlogPost[] = [
  {
    slug: "rhinoplasty-recovery-tips",
    image: "/service-images/rhinoplasty.jpg",
    publishedAt: "2026-08-15",
    reviewedAt: "2026-08-27",
    readingMinutes: 6,
    ar: {
      title: "التعافي بعد تجميل الأنف: أسئلة وخطوات تناقشها مع طبيبك",
      description: "دليل عملي لفترة التعافي بعد تجميل الأنف، من الاستعداد للأيام الأولى إلى علامات تستدعي التواصل مع الفريق الطبي.",
      category: "تجميل الأنف",
      sections: [
        {
          heading: "قبل العودة إلى المنزل",
          paragraphs: ["تختلف تعليمات التعافي حسب نوع الجراحة وحالتك الصحية وخطة الجرّاح. اطلب تعليمات مكتوبة توضح الأدوية والعناية بالجرح ومواعيد المتابعة ومن تتواصل معه عند القلق."],
          bullets: ["رتّب شخصًا يرافقك بعد الإجراء.", "جهّز مكان نوم يتيح رفع الرأس بصورة مريحة.", "تأكد من فهم الأدوية الموصوفة وما يجب تجنبه."],
        },
        {
          heading: "ما المتوقع في الأيام الأولى؟",
          paragraphs: ["التورم والكدمات والاحتقان أمور شائعة بدرجات متفاوتة. لا تحكم على الشكل النهائي مبكرًا، فالتغيرات تهدأ تدريجيًا وقد يستمر تحسن التفاصيل لفترة أطول مما تتوقع."],
          bullets: ["التزم بتعليمات رفع الرأس والنشاط اليومي.", "لا تضع ضغطًا على الأنف أو تعدّل الجبيرة بنفسك.", "اسأل طبيبك قبل العودة للرياضة أو السفر أو ارتداء النظارات."],
        },
        {
          heading: "متى تتواصل مع الفريق الطبي؟",
          paragraphs: ["اتصل بفريقك فورًا عند ظهور عرض شديد أو غير متوقع، مثل صعوبة التنفس المتزايدة، نزف لا يتوقف، ألم يزداد رغم العلاج، حرارة مرتفعة، أو تغير مفاجئ يقلقك. تعليمات جرّاحك تظل المرجع الأول لحالتك."],
        },
      ],
    },
    en: {
      title: "Rhinoplasty recovery: questions and steps to discuss with your surgeon",
      description: "A practical guide to rhinoplasty recovery, from preparing for the first few days to signs that warrant contacting your clinical team.",
      category: "Rhinoplasty",
      sections: [
        {
          heading: "Before you go home",
          paragraphs: ["Recovery instructions vary with the operation, your health, and your surgeon's plan. Ask for written guidance covering medication, wound care, follow-up dates, and who to contact if you are concerned."],
          bullets: ["Arrange for someone to accompany you after the procedure.", "Prepare a comfortable sleeping position that keeps your head elevated.", "Confirm how to take prescribed medicines and what to avoid."],
        },
        {
          heading: "What can you expect in the first days?",
          paragraphs: ["Swelling, bruising, and congestion are common to different degrees. Avoid judging the final appearance early: changes settle gradually and finer details can continue improving for longer than expected."],
          bullets: ["Follow your team's advice on head elevation and daily activity.", "Do not press on the nose or adjust a splint yourself.", "Ask before returning to exercise, flying, or wearing glasses."],
        },
        {
          heading: "When should you contact your clinical team?",
          paragraphs: ["Contact your team promptly for severe or unexpected symptoms, including increasing breathing difficulty, bleeding that does not stop, worsening pain despite treatment, a high temperature, or a sudden change that concerns you. Your surgeon's instructions remain the primary guidance for your case."],
        },
      ],
    },
  },
  {
    slug: "hair-transplant-turkey-guide",
    image: "/service-images/hair-transplant.jpg",
    publishedAt: "2026-08-10",
    reviewedAt: "2026-08-27",
    readingMinutes: 7,
    ar: {
      title: "زراعة الشعر في تركيا: كيف تقارن الطبيب والمركز والخطة؟",
      description: "قائمة عملية لمقارنة خيارات زراعة الشعر في تركيا، تشمل تقييم سبب التساقط وخطة البصيلات والمتابعة والتكلفة المكتوبة.",
      category: "زراعة الشعر",
      sections: [
        {
          heading: "ابدأ بالتشخيص وليس بعدد البصيلات",
          paragraphs: ["ليست كل حالات تساقط الشعر مناسبة للزراعة، وقد يحتاج بعضها إلى تقييم طبي أو علاج مختلف. اسأل من سيقيّم سبب التساقط، ومن سيضع خط الشعر، ومن سينفذ كل مرحلة من الإجراء."],
        },
        {
          heading: "FUE وDHI: الأسماء لا تكفي",
          paragraphs: ["تصف هذه المصطلحات طرقًا في استخراج البصيلات وزراعتها، لكن جودة الخطة تعتمد أيضًا على المنطقة المانحة، توزيع البصيلات، خبرة الفريق، التعقيم والمتابعة. لا تجعل اسم التقنية وحده أساس القرار."],
          bullets: ["اطلب خطة مكتوبة وعددًا تقديريًا للبصيلات مع تفسير.", "ناقش كثافة المنطقة المانحة وحدودها على المدى الطويل.", "تأكد من هوية الطبيب ومسؤوليته أثناء الإجراء."],
        },
        {
          heading: "السفر والتكلفة والمتابعة",
          paragraphs: ["قارن عرض السعر بندًا بندًا: الإجراء والأدوية والفحوصات والنقل والإقامة والمتابعة. اسأل كيف ستتلقى الدعم بعد عودتك، وما الذي يحدث إذا احتجت مراجعة إضافية."],
        },
      ],
    },
    en: {
      title: "Hair transplantation in Türkiye: comparing the doctor, clinic, and plan",
      description: "A practical checklist for comparing hair transplant options in Türkiye, including diagnosis, graft planning, follow-up, and written costs.",
      category: "Hair restoration",
      sections: [
        {
          heading: "Start with diagnosis, not a graft count",
          paragraphs: ["Not every type of hair loss is suited to transplantation; some cases need medical assessment or a different treatment. Ask who evaluates the cause, who designs the hairline, and who performs each part of the procedure."],
        },
        {
          heading: "FUE and DHI: technique names are not enough",
          paragraphs: ["These terms describe approaches to graft extraction and placement, but a sound plan also depends on the donor area, distribution, team experience, infection control, and follow-up. Do not base your decision on the technique label alone."],
          bullets: ["Request a written plan and an explained graft estimate.", "Discuss donor density and its long-term limits.", "Confirm the doctor's identity and responsibility during the procedure."],
        },
        {
          heading: "Travel, cost, and follow-up",
          paragraphs: ["Compare quotations line by line, including the procedure, medication, tests, transport, accommodation, and follow-up. Ask how support works after you return home and what happens if you need an additional review."],
        },
      ],
    },
  },
  {
    slug: "fillers-vs-botox",
    image: "/service-images/dermal-fillers.jpg",
    publishedAt: "2026-08-01",
    reviewedAt: "2026-08-27",
    readingMinutes: 6,
    ar: {
      title: "الفيلر والبوتوكس: ما الفرق وما الأسئلة المهمة قبل الحقن؟",
      description: "مقارنة مبسطة بين الفيلر وحقن إرخاء العضلات، مع أسئلة السلامة والنتائج الواقعية التي تناقشها في الاستشارة.",
      category: "الإجراءات غير الجراحية",
      sections: [
        {
          heading: "وظيفتان مختلفتان",
          paragraphs: ["تُستخدم حقن إرخاء العضلات عادةً لتخفيف مظهر خطوط تعبيرية محددة، بينما تُستخدم أنواع من الفيلر لإضافة حجم أو دعم في مناطق يحددها المختص. اختيار المادة والمنطقة والكمية قرار طبي يعتمد على تشريح الوجه والهدف والحالة الصحية."],
        },
        {
          heading: "أسئلة قبل الإجراء",
          paragraphs: ["اطلب معرفة اسم المنتج ومصدره وخبرة الممارس وخطة التعامل مع المضاعفات. أخبر الطبيب عن الأدوية والحساسية والإجراءات السابقة والحمل أو الرضاعة وأي حالة صحية ذات صلة."],
          bullets: ["ما الهدف الواقعي الذي يمكن تحقيقه؟", "ما الآثار المتوقعة والمخاطر الأقل شيوعًا؟", "كيف ستكون المتابعة إذا ظهرت مشكلة؟", "هل توجد بدائل أبسط أو خيار عدم العلاج؟"],
        },
        {
          heading: "النتيجة ليست واحدة للجميع",
          paragraphs: ["مدة التأثير والاستجابة والآثار الجانبية تختلف بين الأشخاص والمنتجات والمناطق. الصور والتقييمات تساعد على طرح الأسئلة، لكنها لا تضمن نتيجة مماثلة. اختر قرارًا محافظًا ومبنيًا على استشارة مباشرة."],
        },
      ],
    },
    en: {
      title: "Fillers and botulinum toxin: differences and questions before treatment",
      description: "A clear comparison of dermal fillers and muscle-relaxing injections, with safety and outcome questions to discuss at consultation.",
      category: "Non-surgical treatments",
      sections: [
        {
          heading: "Two different functions",
          paragraphs: ["Muscle-relaxing injections are commonly used to soften selected expression lines, while certain fillers add volume or structural support in areas chosen by a clinician. Product, area, and quantity are medical decisions based on facial anatomy, goals, and health history."],
        },
        {
          heading: "Questions before treatment",
          paragraphs: ["Ask about the product name and source, practitioner experience, and the plan for managing complications. Tell the clinician about medicines, allergies, previous procedures, pregnancy or breastfeeding, and relevant health conditions."],
          bullets: ["What realistic goal can this treatment achieve?", "What are the expected effects and less common risks?", "How will follow-up work if a problem occurs?", "Is there a simpler alternative, including no treatment?"],
        },
        {
          heading: "Results differ from person to person",
          paragraphs: ["Duration, response, and adverse effects vary by person, product, and treatment area. Photos and reviews can help frame questions, but cannot guarantee the same outcome. Favor a conservative decision based on a direct clinical consultation."],
        },
      ],
    },
  },
]

export const BLOG_SLUGS = POSTS.map((post) => post.slug)

export function listBlogPosts(locale: Locale): LocalizedBlogPost[] {
  return POSTS.map((post) => ({
    slug: post.slug,
    image: post.image,
    publishedAt: post.publishedAt,
    reviewedAt: post.reviewedAt,
    readingMinutes: post.readingMinutes,
    ...post[locale],
  }))
}

export function getBlogPost(slug: string, locale: Locale): LocalizedBlogPost | undefined {
  return listBlogPosts(locale).find((post) => post.slug === slug)
}
