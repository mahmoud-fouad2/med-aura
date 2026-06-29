/** Arabic labels for status enums shown in the UI. */

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

const SUITABILITY: Record<string, string> = {
  PENDING: "قيد التقييم",
  SUITABLE_PRELIMINARILY: "مرشّح مبدئيًا",
  MORE_INFORMATION_REQUIRED: "بحاجة لمعلومات إضافية",
  IN_PERSON_ASSESSMENT_REQUIRED: "يتطلب تقييمًا حضوريًا",
  NOT_SUITABLE: "غير مناسب حاليًا",
  REFERRED_ELSEWHERE: "إحالة لجهة أنسب",
}

export const caseStatusAr = (s: string): string => CASE[s] ?? s
export const appointmentStatusAr = (s: string): string => APPOINTMENT[s] ?? s
export const paymentStatusAr = (s: string): string => PAYMENT[s] ?? s
export const suitabilityAr = (s: string): string => SUITABILITY[s] ?? s
