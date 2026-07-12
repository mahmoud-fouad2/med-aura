/** Arabic labels for status enums shown in the UI. */

const CURRENCY: Record<string, string> = {
  SAR: "ر.س",
  AED: "د.إ",
  USD: "$",
  EUR: "€",
  QAR: "ر.ق",
  KWD: "د.ك",
  BHD: "د.ب",
  OMR: "ر.ع",
  EGP: "ج.م",
  TRY: "₺",
}

/** Arabic currency symbol for a given ISO code — falls back to the code itself for anything not mapped. */
export const currencyAr = (code: string): string => CURRENCY[code] ?? code

const COUNTRY: Record<string, string> = {
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
}

/** Arabic country name for a stored ISO alpha-2 code — falls back to the stored value itself
 * (e.g. a value already spelled out in Arabic) for anything not in the map. */
export const countryNameAr = (value: string): string => COUNTRY[value] ?? value

/** ISO codes of the countries the platform serves — signup/profile selects. */
export const COUNTRY_CODES = Object.keys(COUNTRY)

const CASE: Record<string, string> = {
  DRAFT: "مسودة",
  SUBMITTED: "تم الإرسال",
  MATCHING: "جارٍ المطابقة",
  SHARED_WITH_PROVIDER: "تمت مشاركتها مع الطبيب",
  UNDER_REVIEW: "قيد المراجعة",
  MORE_INFORMATION_REQUIRED: "بحاجة لمعلومات إضافية",
  CONSULTATION_REQUIRED: "تتطلب استشارة",
  CONSULTATION_BOOKED: "تم حجز الاستشارة",
  CONSULTATION_COMPLETED: "اكتملت الاستشارة",
  TREATMENT_PLAN_ISSUED: "صدرت الخطة العلاجية",
  QUOTE_ISSUED: "صدر عرض السعر",
  PATIENT_REVIEWING: "قيد مراجعة المريض",
  QUOTE_ACCEPTED: "تم قبول العرض",
  DEPOSIT_PAID: "تم دفع العربون",
  MEDICALLY_APPROVED: "تم الاعتماد الطبي",
  CENTER_CONFIRMED: "أكّد المركز",
  FULLY_PAID: "مدفوع بالكامل",
  PROCEDURE_CONFIRMED: "تم تأكيد الإجراء",
  PROCEDURE_COMPLETED: "اكتمل الإجراء",
  FOLLOW_UP: "المتابعة",
  CLOSED: "مغلقة",
  CANCELLED: "ملغاة",
}

const APPOINTMENT: Record<string, string> = {
  PENDING_PAYMENT: "بانتظار الدفع",
  PENDING_PROVIDER_CONFIRMATION: "بانتظار تأكيد الطبيب",
  CONFIRMED: "مؤكد",
  CHECKED_IN: "تم الحضور",
  IN_PROGRESS: "جارٍ",
  COMPLETED: "مكتمل",
  RESCHEDULED: "أعيدت جدولته",
  CANCELLED_BY_PATIENT: "ألغاه المريض",
  CANCELLED_BY_PROVIDER: "ألغاه الطبيب",
  NO_SHOW: "لم يحضر",
}

const PAYMENT: Record<string, string> = {
  CREATED: "أُنشئت",
  PENDING: "قيد المعالجة",
  REQUIRES_ACTION: "تتطلب إجراء",
  AUTHORIZED: "محجوزة",
  PAID: "مدفوعة",
  FAILED: "فشلت",
  CANCELLED: "ملغاة",
  PARTIALLY_REFUNDED: "مستردة جزئيًا",
  REFUNDED: "مستردة",
  DISPUTED: "متنازع عليها",
}

const PAYMENT_PURPOSE: Record<string, string> = {
  CONSULTATION_FEE: "رسوم استشارة",
  DEPOSIT: "عربون",
  PARTIAL_PAYMENT: "دفعة جزئية",
  FINAL_PAYMENT: "سداد المتبقي",
  SERVICE_FEE: "رسوم خدمة",
}

const SUITABILITY: Record<string, string> = {
  PENDING: "قيد التقييم",
  SUITABLE_PRELIMINARILY: "مرشّح مبدئيًا",
  MORE_INFORMATION_REQUIRED: "بحاجة لمعلومات إضافية",
  IN_PERSON_ASSESSMENT_REQUIRED: "يتطلب تقييمًا حضوريًا",
  NOT_SUITABLE: "غير مناسب حاليًا",
  REFERRED_ELSEWHERE: "إحالة لجهة أنسب",
}

const INVOICE: Record<string, string> = {
  DRAFT: "مسودة",
  ISSUED: "صدرت",
  PARTIALLY_PAID: "مدفوعة جزئيًا",
  PAID: "مدفوعة بالكامل",
  OVERDUE: "متأخرة السداد",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
  PARTIALLY_REFUNDED: "مستردة جزئيًا",
}

const SAFETY_SEVERITY: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "مرتفعة",
  CRITICAL: "حرجة",
}

const SAFETY_STATUS: Record<string, string> = {
  OPEN: "مفتوح",
  ACKNOWLEDGED: "تم الاطّلاع",
  CONTACTED: "تم التواصل",
  PROVIDER_REVIEWED: "راجعه الطبيب",
  RESOLVED: "تمت المعالجة",
  REFERRED_TO_EMERGENCY: "إحالة للطوارئ",
  FALSE_ALARM: "إنذار غير حقيقي",
}

const REFUND: Record<string, string> = {
  REQUESTED: "مُقدَّم",
  UNDER_REVIEW: "قيد المراجعة",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
  PROVIDER_CONFIRMED: "أكّده المزوّد",
  PROCESSED: "تمت المعالجة",
  FAILED: "فشل",
  CANCELLED: "ملغى",
}

const QUOTE: Record<string, string> = {
  DRAFT: "مسودة",
  SENT: "أُرسل",
  VIEWED: "تمت المشاهدة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  EXPIRED: "منتهي الصلاحية",
  CANCELLED: "ملغى",
  SUPERSEDED: "استُبدل بعرض أحدث",
}

const PROCEDURE_BOOKING: Record<string, string> = {
  PENDING_MEDICAL_APPROVAL: "بانتظار الاعتماد الطبي",
  PENDING_CENTER_CONFIRMATION: "بانتظار تأكيد المركز",
  PENDING_PATIENT_REQUIREMENTS: "بانتظار متطلبات المريض",
  CONFIRMED: "مؤكد",
  RESCHEDULE_REQUESTED: "طُلبت إعادة الجدولة",
  RESCHEDULED: "أُعيدت جدولته",
  CANCELLED: "ملغى",
  COMPLETED: "مكتمل",
  NO_SHOW: "لم يحضر",
}

const CENTER_ROLE: Record<string, string> = {
  owner: "مالك المركز",
  admin: "مدير",
  staff: "طاقم",
}

/** approved/pending/rejected/suspended — shared by admin doctor + center listings. */
const PROVIDER_STATUS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  suspended: "موقوف",
}
export const PROVIDER_STATUSES = Object.keys(PROVIDER_STATUS)

const FOLLOW_UP_TASK: Record<string, string> = {
  SCHEDULED: "مجدولة",
  DUE: "مستحقة الآن",
  SUBMITTED: "بانتظار مراجعة الطبيب",
  UNDER_REVIEW: "قيد المراجعة",
  COMPLETED: "مكتملة",
  MISSED: "فائتة",
  ESCALATED: "تم التصعيد",
  CANCELLED: "ملغاة",
}

const APPOINTMENT_TYPE: Record<string, string> = {
  VIDEO_CONSULTATION: "استشارة فيديو",
  IN_PERSON_CONSULTATION: "استشارة حضورية",
  PHONE_CONSULTATION: "استشارة هاتفية",
  PROCEDURE: "إجراء",
  FOLLOW_UP: "متابعة",
}

export const caseStatusAr = (s: string): string => CASE[s] ?? s
export const appointmentStatusAr = (s: string): string => APPOINTMENT[s] ?? s
export const appointmentTypeAr = (s: string): string => APPOINTMENT_TYPE[s] ?? s
export const paymentStatusAr = (s: string): string => PAYMENT[s] ?? s
export const suitabilityAr = (s: string): string => SUITABILITY[s] ?? s
export const invoiceStatusAr = (s: string): string => INVOICE[s] ?? s
export const safetyAlertSeverityAr = (s: string): string => SAFETY_SEVERITY[s] ?? s
export const safetyAlertStatusAr = (s: string): string => SAFETY_STATUS[s] ?? s
export const refundStatusAr = (s: string): string => REFUND[s] ?? s
export const followUpTaskStatusAr = (s: string): string => FOLLOW_UP_TASK[s] ?? s
export const paymentPurposeAr = (s: string): string => PAYMENT_PURPOSE[s] ?? s
export const quoteStatusAr = (s: string): string => QUOTE[s] ?? s
export const procedureBookingStatusAr = (s: string): string => PROCEDURE_BOOKING[s] ?? s
export const centerRoleAr = (s: string): string => CENTER_ROLE[s] ?? s
export const providerStatusAr = (s: string): string => PROVIDER_STATUS[s] ?? s
