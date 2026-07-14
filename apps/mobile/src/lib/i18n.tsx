import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { I18nManager } from "react-native"
import * as SecureStore from "expo-secure-store"

export type Locale = "ar" | "en"

const LOCALE_KEY = "medaura.locale"

const ar = {
  appName: "Med Aura",
  common: {
    next: "التالي",
    back: "السابق",
    skip: "تخطي",
    start: "ابدأ الآن",
    retry: "إعادة المحاولة",
    cancel: "إلغاء",
    confirm: "تأكيد",
    loading: "لحظات من فضلك…",
    loadFailed: "تعذر تحميل البيانات. حاول مرة أخرى.",
    offline: "انقطع الاتصال بالإنترنت.",
    sessionExpired: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
    seeAll: "عرض الكل",
  },
  onboarding: {
    slides: [
      {
        title: "اختاري طبيبك بثقة",
        body: "تصفحي الأطباء والخدمات وابدئي رحلتك بخطوات واضحة.",
      },
      {
        title: "استشارتك أقرب مما تتوقعين",
        body: "احجزي استشارة حضورية أو عن بُعد في الوقت المناسب لك.",
      },
      {
        title: "كل تفاصيل رحلتك في مكان واحد",
        body: "تابعي مواعيدك وملفاتك ومدفوعاتك وتحديثات حالتك بسهولة.",
      },
      {
        title: "خصوصيتك أولوية",
        body: "تحكمي في بياناتك وملفاتك الطبية بأمان ووضوح.",
      },
    ],
  },
  auth: {
    welcomeTitle: "أهلًا بعودتك",
    welcomeBody: "سجّلي الدخول لمتابعة رحلتك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    forgot: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    haveAccount: "لديك حساب بالفعل؟",
    createTitle: "أنشئ حسابك",
    chooseType: "اختر نوع الحساب لنجهّز لك التجربة المناسبة",
    patientTitle: "أنا مريض",
    patientBody: "أبحث عن إجراء تجميلي وأريد استشارة ومتابعة موثوقة.",
    doctorTitle: "أنا طبيب",
    doctorBody: "أقدّم خدمات تجميلية وأرغب بالانضمام بعد التحقق من الترخيص.",
    reviewNote: "حسابات الأطباء تمر بمراجعة واعتماد قبل الظهور — حفاظًا على ثقة المرضى.",
    name: "الاسم الكامل",
    phone: "رقم الجوال",
    country: "دولة الإقامة",
    city: "المدينة (اختياري)",
    agree: "أوافق على الشروط والأحكام وسياسة الخصوصية",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    emailExists: "هذا البريد الإلكتروني مسجّل بالفعل.",
    genericError: "تعذّر إتمام العملية، حاول مرة أخرى.",
    agreeRequired: "يلزم الموافقة على الشروط للمتابعة.",
    signOut: "تسجيل الخروج",
    signOutConfirm: "هل تريد تسجيل الخروج من حسابك؟",
  },
  tabs: {
    home: "الرئيسية",
    explore: "استكشاف",
    appointments: "مواعيدي",
    profile: "حسابي",
  },
  home: {
    morning: "صباح الخير",
    evening: "مساء الخير",
    heroCta: "احجزي استشارتك",
    heroBody: "رحلتك التجميلية تبدأ بقرار موثوق.",
    quickActions: "إجراءات سريعة",
    bookAction: "حجز موعد",
    exploreAction: "استكشاف الأطباء",
    myAppointments: "مواعيدي",
    myProfile: "ملفي",
    nextAppointment: "موعدك القادم",
    noUpcoming: "لا توجد مواعيد قادمة حاليًا.",
    bookFirst: "ابدئي بحجز استشارتك الأولى",
    featuredDoctors: "أطباء موثوقون",
  },
  explore: {
    title: "استكشاف الأطباء",
    searchPlaceholder: "ابحثي باسم الطبيب أو الإجراء…",
    empty: "لا توجد نتائج مطابقة. جرّبي كلمة مختلفة.",
    verified: "موثّق",
    years: "سنة خبرة",
    viewProfile: "عرض الملف",
  },
  doctor: {
    experience: "الخبرة",
    rating: "التقييم",
    fee: "رسوم الاستشارة",
    about: "نبذة",
    procedures: "الإجراءات",
    languages: "اللغات",
    center: "المركز",
    book: "احجزي استشارة",
    bookNote: "اختاري الموعد المناسب وأكملي الحجز من داخل التطبيق.",
  },
  booking: {
    title: "حجز استشارة",
    typeVideo: "استشارة عن بُعد",
    typeInPerson: "استشارة حضورية",
    pickDay: "اختاري اليوم",
    pickTime: "اختاري الوقت",
    fee: "رسوم الاستشارة",
    confirm: "تأكيد الحجز",
    noSlots: "لا توجد مواعيد متاحة حاليًا — جرّبي نوعًا آخر أو عودي لاحقًا.",
    slotTaken: "هذا الموعد لم يعد متاحًا، اختاري موعدًا آخر.",
    successTitle: "تم إنشاء الحجز",
    successPay: "أكملي الدفع في الصفحة الآمنة لتأكيد موعدك.",
    successPending: "سيتواصل معك الفريق لتأكيد الموعد وإتمام الدفع.",
    payNow: "إتمام الدفع",
    viewAppointments: "عرض مواعيدي",
    cancelPolicy: "يمكنك إلغاء الموعد أو إعادة جدولته قبل موعده حسب سياسة الإلغاء.",
  },
  appointments: {
    title: "مواعيدي",
    upcoming: "القادمة",
    past: "السابقة",
    emptyUpcoming: "لا توجد مواعيد قادمة حاليًا.",
    emptyPast: "لا توجد مواعيد سابقة.",
    with: "مع",
  },
  profile: {
    title: "حسابي",
    language: "اللغة",
    arabic: "العربية",
    english: "English",
    restartNote: "سيُعاد تشغيل التطبيق لتطبيق اللغة.",
    aboutOnboarding: "التعرّف على التطبيق",
    privacy: "سياسة الخصوصية",
    terms: "الشروط والأحكام",
    support: "الدعم",
    completeAccreditation: "أكمل طلب اعتماد الطبيب",
  },
  status: {
    PENDING_PAYMENT: "بانتظار الدفع",
    PENDING_PROVIDER_CONFIRMATION: "بانتظار تأكيد الطبيب",
    CONFIRMED: "مؤكد",
    CHECKED_IN: "تم الحضور",
    IN_PROGRESS: "جارٍ",
    COMPLETED: "مكتمل",
    RESCHEDULED: "أعيدت جدولته",
    CANCELLED_BY_PATIENT: "ملغي",
    CANCELLED_BY_PROVIDER: "ألغاه الطبيب",
    NO_SHOW: "لم يحضر",
  } as Record<string, string>,
  countries: {
    SA: "السعودية",
    AE: "الإمارات",
    QA: "قطر",
    KW: "الكويت",
    BH: "البحرين",
    OM: "عُمان",
    TR: "تركيا",
    EG: "مصر",
    JO: "الأردن",
    LB: "لبنان",
  } as Record<string, string>,
}

const en: typeof ar = {
  appName: "Med Aura",
  common: {
    next: "Next",
    back: "Back",
    skip: "Skip",
    start: "Get started",
    retry: "Try again",
    cancel: "Cancel",
    confirm: "Confirm",
    loading: "One moment…",
    loadFailed: "Couldn't load data. Please try again.",
    offline: "You're offline.",
    sessionExpired: "Your session ended. Please sign in again.",
    seeAll: "See all",
  },
  onboarding: {
    slides: [
      {
        title: "Choose your doctor with confidence",
        body: "Browse trusted doctors and services, and start your journey with clear steps.",
      },
      {
        title: "Your consultation, closer than you think",
        body: "Book an in-person or remote consultation at a time that suits you.",
      },
      {
        title: "Your whole journey in one place",
        body: "Follow your appointments, files, payments, and case updates with ease.",
      },
      {
        title: "Your privacy comes first",
        body: "Stay in control of your data and medical files, safely and clearly.",
      },
    ],
  },
  auth: {
    welcomeTitle: "Welcome back",
    welcomeBody: "Sign in to continue your journey",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signUp: "Create account",
    forgot: "Forgot password?",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    createTitle: "Create your account",
    chooseType: "Choose your account type so we tailor the experience",
    patientTitle: "I'm a patient",
    patientBody: "Looking for an aesthetic procedure with trusted follow-up.",
    doctorTitle: "I'm a doctor",
    doctorBody: "I provide aesthetic services and want to join after verification.",
    reviewNote: "Doctor accounts are reviewed and accredited before appearing — to protect patient trust.",
    name: "Full name",
    phone: "Mobile number",
    country: "Country of residence",
    city: "City (optional)",
    agree: "I agree to the Terms and the Privacy Policy",
    invalidCredentials: "Incorrect email or password.",
    emailExists: "This email is already registered.",
    genericError: "Something went wrong. Please try again.",
    agreeRequired: "You must accept the terms to continue.",
    signOut: "Sign out",
    signOutConfirm: "Do you want to sign out of your account?",
  },
  tabs: {
    home: "Home",
    explore: "Explore",
    appointments: "Appointments",
    profile: "Account",
  },
  home: {
    morning: "Good morning",
    evening: "Good evening",
    heroCta: "Book a consultation",
    heroBody: "Your aesthetic journey starts with a trusted decision.",
    quickActions: "Quick actions",
    bookAction: "Book",
    exploreAction: "Explore doctors",
    myAppointments: "My appointments",
    myProfile: "My profile",
    nextAppointment: "Your next appointment",
    noUpcoming: "No upcoming appointments yet.",
    bookFirst: "Start by booking your first consultation",
    featuredDoctors: "Trusted doctors",
  },
  explore: {
    title: "Explore doctors",
    searchPlaceholder: "Search by doctor or procedure…",
    empty: "No matching results. Try a different search.",
    verified: "Verified",
    years: "yrs experience",
    viewProfile: "View profile",
  },
  doctor: {
    experience: "Experience",
    rating: "Rating",
    fee: "Consultation fee",
    about: "About",
    procedures: "Procedures",
    languages: "Languages",
    center: "Center",
    book: "Book a consultation",
    bookNote: "Pick a time and complete your booking inside the app.",
  },
  booking: {
    title: "Book a consultation",
    typeVideo: "Remote consultation",
    typeInPerson: "In-person consultation",
    pickDay: "Pick a day",
    pickTime: "Pick a time",
    fee: "Consultation fee",
    confirm: "Confirm booking",
    noSlots: "No available times right now — try another type or check back soon.",
    slotTaken: "That time was just taken. Please pick another one.",
    successTitle: "Booking created",
    successPay: "Complete the payment on the secure page to confirm your appointment.",
    successPending: "Our team will contact you to confirm and complete payment.",
    payNow: "Complete payment",
    viewAppointments: "View my appointments",
    cancelPolicy: "You can cancel or reschedule before your appointment per the cancellation policy.",
  },
  appointments: {
    title: "My appointments",
    upcoming: "Upcoming",
    past: "Past",
    emptyUpcoming: "No upcoming appointments yet.",
    emptyPast: "No past appointments.",
    with: "with",
  },
  profile: {
    title: "My account",
    language: "Language",
    arabic: "العربية",
    english: "English",
    restartNote: "The app will restart to apply the language.",
    aboutOnboarding: "App tour",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    support: "Support",
    completeAccreditation: "Complete doctor accreditation",
  },
  status: {
    PENDING_PAYMENT: "Awaiting payment",
    PENDING_PROVIDER_CONFIRMATION: "Awaiting confirmation",
    CONFIRMED: "Confirmed",
    CHECKED_IN: "Checked in",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    RESCHEDULED: "Rescheduled",
    CANCELLED_BY_PATIENT: "Cancelled",
    CANCELLED_BY_PROVIDER: "Cancelled by doctor",
    NO_SHOW: "No show",
  },
  countries: {
    SA: "Saudi Arabia",
    AE: "UAE",
    QA: "Qatar",
    KW: "Kuwait",
    BH: "Bahrain",
    OM: "Oman",
    TR: "Türkiye",
    EG: "Egypt",
    JO: "Jordan",
    LB: "Lebanon",
  },
}

const DICTS: Record<Locale, typeof ar> = { ar, en }

type I18nValue = {
  locale: Locale
  t: typeof ar
  isRTL: boolean
  setLocale: (l: Locale) => Promise<void>
}

const I18nContext = createContext<I18nValue | null>(null)

/** Arabic-first: the app defaults to ar/RTL; the choice persists on-device. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar")

  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_KEY).then((saved) => {
      if (saved === "en" || saved === "ar") setLocaleState(saved)
    })
  }, [])

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l)
    await SecureStore.setItemAsync(LOCALE_KEY, l)
    const wantRTL = l === "ar"
    if (I18nManager.isRTL !== wantRTL) {
      I18nManager.allowRTL(wantRTL)
      I18nManager.forceRTL(wantRTL)
      // Direction flips apply on next launch; the profile screen explains this.
    }
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ locale, t: DICTS[locale], isRTL: locale === "ar", setLocale }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
