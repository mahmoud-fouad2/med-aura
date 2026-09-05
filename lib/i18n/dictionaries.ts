import type { Locale } from "./config"

/**
 * Translation dictionaries. Arabic is the source of truth; English mirrors its
 * shape. Keep UI copy here rather than scattering literals across components.
 */
const ar = {
  brand: { tagline: "رحلتكِ نحو الجمال تبدأ بقرارٍ موثوق وخبرةٍ رائدة" },
  nav: {
    procedures: "الإجراءات التجميلية",
    doctors: "نخبة الأطباء",
    centers: "المراكز",
    destinations: "الوجهات العلاجية",
    onlineConsultation: "الاستشارة المرئية",
    howItWorks: "كيف تعمل المنصة",
    blog: "المدونة والأدلة",
    trust: "الثقة والأمان",
    signIn: "تسجيل الدخول",
    startConsultation: "ابدئي استشارتكِ",
    dashboard: "لوحة التحكم",
    signOut: "تسجيل الخروج",
  },
  common: {
    search: "بحث",
    loading: "جارٍ التحميل…",
    save: "حفظ",
    cancel: "إلغاء",
    next: "التالي",
    back: "السابق",
    submit: "إرسال",
    required: "هذا الحقل مطلوب",
    none: "لا يوجد",
    sar: "ر.س",
  },
  home: {
    heroTitle: "رحلتكِ التجميلية تبدأ بقرارٍ موثوق ووضوحٍ تام",
    heroSubtitle:
      "قارني بين خيارات التجميل، وشاركي تفاصيل حالتكِ بخصوصية، وابدئي استشارة واضحة مع طبيب أو مركز تُراجع المنصة بياناته المهنية قبل النشر.",
    searchPlaceholder: "ابحثي عن إجراء تجميلي، طبيب، أو مركز معتمد…",
    exploreByArea: "استكشفي حسب المنطقة التجميلية",
    popularProcedures: "الإجراءات التجميلية الأكثر طلباً",
    verifiedDoctors: "أطباء تجميل بعد مراجعة التراخيص",
    verifiedCenters: "مراكز تجميل بعد مراجعة البيانات",
    howItWorks: "كيف نرافقكِ في Med Aura",
    noDataYet: "لا يوجد محتوى منشور بعد في هذا القسم.",
  },
  authShell: {
    licenseCheck: "أطباء ومراكز استوفت أعلى معايير الفحص والترخيص",
    fileProtection: "مشاركة خاصة لملفات الحالة مع الأطراف المخوّلة",
    verifiedReviews: "تجارب وتقييمات حقيقية من مراجعين موثقين",
    backHome: "العودة إلى الرئيسية",
  },
  search: {
    title: "ابحث عن طبيب أو إجراء تجميلي",
    resultsCount: (n: number) => {
      if (n === 0) return "0 طبيب"
      if (n === 1) return "طبيب واحد متاح"
      if (n === 2) return "طبيبان متاحان"
      if (n >= 3 && n <= 10) return `${n} أطباء متاحين`
      return `${n} طبيباً متاحاً`
    },
    empty: "لم نجد نتائج تطابق بحثك حالياً. يمكنك تعديل خيارات التصفية أو التواصل معنا لمساعدتك.",
    filters: "تصفية النتائج",
    procedure: "الإجراء التجميلي",
    country: "الدولة",
    city: "المدينة",
    consultationType: "نوع الاستشارة",
    sortBy: "ترتيب حسب",
  },
  auth: {
    signInTitle: "مرحباً بكِ مجدداً",
    signUpTitle: "إنشاء حساب جديد",
    signInSubtitle: "سجّلي الدخول لمتابعة استشاراتكِ وخطتكِ العلاجية بكل سهولة",
    signUpSubtitle: "أنشئي حسابكِ للبدء في استشارتكِ الطبية بسرية وأمان تام",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    haveAccount: "لديكِ حساب بالفعل؟",
    noAccount: "ليس لديكِ حساب بعد؟",
    providerNote:
      "هل أنت طبيب أو ممثل مركز تجميل؟ أنشئ حساب مريض أولاً ثم قدّم طلب انضمام مقدّم خدمة من لوحة التحكم.",
  },
}

const en: Dictionary = {
  brand: { tagline: "Your aesthetic journey starts with a trusted decision" },
  nav: {
    procedures: "Procedures",
    doctors: "Doctors",
    centers: "Centers",
    destinations: "Destinations",
    onlineConsultation: "Online consultation",
    howItWorks: "How it works",
    blog: "Blog & Guides",
    trust: "Trust & Safety",
    signIn: "Sign in",
    startConsultation: "Start consultation",
    dashboard: "Dashboard",
    signOut: "Sign out",
  },
  common: {
    search: "Search",
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    submit: "Submit",
    required: "This field is required",
    none: "None",
    sar: "SAR",
  },
  home: {
    heroTitle: "Your aesthetic journey starts with a trusted decision",
    heroSubtitle:
      "Compare aesthetic-care options, share your case privately, and start a clear consultation with providers whose professional details are reviewed before publication.",
    searchPlaceholder: "Search a procedure, doctor or center…",
    exploreByArea: "Explore by area",
    popularProcedures: "Most requested procedures",
    verifiedDoctors: "Verified doctors",
    verifiedCenters: "Verified centers",
    howItWorks: "How Med Aura works",
    noDataYet: "No published content in this section yet.",
  },
  authShell: {
    licenseCheck: "Carefully accepted doctors and centers",
    fileProtection: "Share photos and files with your permission",
    verifiedReviews: "Reviews and experiences that help comparison",
    backHome: "Back to home",
  },
  search: {
    title: "Find a doctor or procedure",
    resultsCount: (n: number) => `${n} result${n === 1 ? "" : "s"}`,
    empty: "No matching results. Try adjusting your filters.",
    filters: "Filters",
    procedure: "Procedure",
    country: "Country",
    city: "City",
    consultationType: "Consultation type",
    sortBy: "Sort by",
  },
  auth: {
    signInTitle: "Welcome back",
    signUpTitle: "Create your account",
    signInSubtitle: "Sign in to continue your journey",
    signUpSubtitle: "We'll set up a patient account to get you started safely",
    name: "Full name",
    email: "Email",
    password: "Password",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    providerNote:
      "Are you a doctor or aesthetic center? Create a patient account first, then submit a provider application from your dashboard.",
  },
}

export type Dictionary = typeof ar

const dictionaries: Record<Locale, Dictionary> = { ar, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.ar
}
