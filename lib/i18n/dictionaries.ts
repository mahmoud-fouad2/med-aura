import type { Locale } from "./config"

/**
 * Translation dictionaries. Arabic is the source of truth; English mirrors its
 * shape. Keep UI copy here rather than scattering literals across components.
 */
const ar = {
  brand: { tagline: "رحلتك التجميلية تبدأ بقرار موثوق" },
  nav: {
    procedures: "الإجراءات",
    doctors: "الأطباء",
    centers: "المراكز",
    howItWorks: "كيف تعمل المنصة",
    trust: "الثقة والأمان",
    signIn: "تسجيل الدخول",
    startConsultation: "ابدأ استشارتك",
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
    heroTitle: "رحلتك التجميلية تبدأ بقرار موثوق",
    heroSubtitle:
      "استشر نخبة من أطباء ومراكز التجميل المعتمدين، شارك حالتك بأمان، واستلم خطة وسعرًا واضحًا قبل اتخاذ القرار.",
    searchPlaceholder: "ابحث عن إجراء أو طبيب أو مركز…",
    exploreByArea: "اكتشف حسب المنطقة",
    popularProcedures: "الإجراءات الأكثر طلبًا",
    verifiedDoctors: "الأطباء الموثقون",
    verifiedCenters: "المراكز الموثقة",
    howItWorks: "كيف تعمل Med Aura",
    noDataYet: "لا يوجد محتوى منشور بعد في هذا القسم.",
  },
  search: {
    title: "ابحث عن طبيب أو إجراء",
    resultsCount: (n: number) => `${n} نتيجة`,
    empty: "لا توجد نتائج مطابقة. جرّب تعديل عوامل التصفية.",
    filters: "عوامل التصفية",
    procedure: "الإجراء",
    country: "الدولة",
    city: "المدينة",
    consultationType: "نوع الاستشارة",
    sortBy: "ترتيب حسب",
  },
  auth: {
    signInTitle: "مرحبًا بعودتك",
    signUpTitle: "أنشئ حسابك",
    signInSubtitle: "سجّل الدخول لمتابعة رحلتك",
    signUpSubtitle: "ننشئ لك حساب مريض للبدء بأمان",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    haveAccount: "لديك حساب بالفعل؟",
    noAccount: "ليس لديك حساب؟",
    providerNote:
      "هل أنت طبيب أو مركز تجميل؟ أنشئ حساب مريض أولًا ثم قدّم طلب انضمام مقدّم خدمة من لوحة التحكم.",
  },
}

const en: Dictionary = {
  brand: { tagline: "Your aesthetic journey starts with a trusted decision" },
  nav: {
    procedures: "Procedures",
    doctors: "Doctors",
    centers: "Centers",
    howItWorks: "How it works",
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
      "Consult accredited aesthetic doctors and centers, share your case securely, and receive a clear plan and price before you decide.",
    searchPlaceholder: "Search a procedure, doctor or center…",
    exploreByArea: "Explore by area",
    popularProcedures: "Most requested procedures",
    verifiedDoctors: "Verified doctors",
    verifiedCenters: "Verified centers",
    howItWorks: "How Med Aura works",
    noDataYet: "No published content in this section yet.",
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
