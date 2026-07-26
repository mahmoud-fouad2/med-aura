/**
 * One place mapping every audit action string to a human Arabic label —
 * used by the activity log and anywhere else that needs to show an audit
 * action to a person instead of a raw dot-namespaced string. Extend this
 * list whenever a new writeAudit({ action: "..." }) call site is added
 * elsewhere in the app; unmapped actions fall back to the raw string
 * rather than throwing, so a missing label never breaks the page.
 */
const ACTION_LABELS_AR: Record<string, string> = {
  // Auth
  "auth.signup": "تسجيل حساب جديد",
  "auth.login": "تسجيل دخول",
  "signup.profile_completed": "إكمال بيانات التسجيل",

  // Profile
  "profile.updated_from_app": "تعديل الملف الشخصي من التطبيق",
  "profile.photo.updated": "تحديث الصورة الشخصية",
  "profile.photo.removed": "حذف الصورة الشخصية",

  // Appointments / video
  "appointment.confirm": "تأكيد موعد",
  "appointment.confirmed": "تأكيد موعد",
  "video.room_created": "إنشاء غرفة استشارة مرئية",
  "video.token_issued": "إصدار رمز دخول الفيديو",
  "video.join_denied": "رفض دخول الفيديو",
  "video.ended": "إنهاء الاستشارة المرئية",
  "video_qa.room_created": "[QA] إنشاء غرفة فيديو تجريبية",
  "video_qa.room_ended": "[QA] إنهاء غرفة فيديو تجريبية",
  "video_qa.patient_joined": "[QA] دخول المريض التجريبي",
  "video_qa.doctor_joined": "[QA] دخول الطبيب التجريبي",
  "video_qa.patient_left": "[QA] خروج المريض التجريبي",
  "video_qa.doctor_left": "[QA] خروج الطبيب التجريبي",
  "video_qa.account_marked_test": "[QA] تحديد حساب اختبار",

  // Payments / invoices
  "payment.paid": "دفع ناجح",
  "payment.success": "دفع ناجح",
  "payment.failed": "فشل دفع",
  "payment.test_paid": "[QA] تأكيد دفع اختباري",
  "payment.manual_recorded": "تسجيل دفعة يدوية",
  "payment.manual_cancelled": "إلغاء دفعة يدوية",
  "invoice.downloaded": "تحميل فاتورة",
  "invoice.final_payment.create": "بدء سداد المتبقي",
  "invoice.final_payment.paid": "سداد المتبقي بنجاح",
  "deposit.paid": "دفع عربون",

  // Refunds
  "refund.request": "طلب استرجاع",
  "refund.approve": "قبول استرجاع",
  "refund.reject": "رفض استرجاع",
  "refund.provider_confirm": "تأكيد مزوّد الاسترجاع",
  "refund.process": "معالجة استرجاع",
  "refund.processed": "تم الاسترجاع",

  // Cases
  "case.create": "إنشاء حالة",
  "case.update": "تحديث حالة",
  "case.closed": "إغلاق حالة",
  "case.reopened": "إعادة فتح حالة",

  // Providers / applications
  "provider_application.submit": "تقديم طلب انضمام",
  "provider.approve": "اعتماد مقدم خدمة",
  "provider.reject": "رفض مقدم خدمة",

  // Safety / follow-up
  "safety_alert.created": "إنشاء تنبيه سلامة",
  "safety_alert.resolve": "معالجة تنبيه سلامة",
  "followup.submitted": "إرسال بيانات متابعة",
  "followup.scheduled": "جدولة متابعة",

  // Content / catalog
  "catalog.procedure_create": "إنشاء إجراء",
  "catalog.category_create": "إنشاء قسم",
  "before_after_case.approve": "اعتماد قبل/بعد",

  // Consent / notifications
  "consent.grant": "منح موافقة",
  "consent.revoke": "سحب موافقة",
  "notification.preferences_update": "تحديث تفضيلات الإشعارات",

  // Travel
  "travel_request.submit": "طلب سفر",
  "travel_offer.send": "إرسال عرض سفر",
  "travel_offer.accept": "قبول عرض سفر",

  // Medical / procedure / quote
  "medical.approved": "اعتماد طبي",
  "center.confirmed": "تأكيد المركز للموعد",
  "center.update": "تعديل بيانات المركز",
  "center.status.update": "تغيير حالة اعتماد المركز",
  "center.published.update": "تغيير ظهور المركز",
  "center.coordinates.update": "تحديد موقع المركز",
  "center.coordinates.clear": "إزالة موقع المركز",
  "doctor.update": "تعديل بيانات الطبيب",
  "doctor.status.update": "تغيير حالة اعتماد الطبيب",
  "doctor.published.update": "تغيير ظهور الطبيب",
  "doctor.procedure.assign": "إسناد إجراء للطبيب",
  "doctor.procedure.unassign": "إزالة إجراء من الطبيب",
  "procedure.confirmed": "تأكيد إجراء",
  "procedure.completed": "اكتمال إجراء",
  "quote.sent": "إرسال عرض سعر",
  "treatment_plan.published": "نشر خطة علاجية",

  // Users / roles
  "user.role.grant": "منح صلاحية مستخدم",
  "user.role.revoke": "سحب صلاحية مستخدم",
  "user.update": "تعديل بيانات مستخدم",
  "user.sessions.revoke": "تسجيل خروج إجباري",
  "user.password_reset.request": "طلب إعادة تعيين كلمة المرور",
  "user.activate": "تفعيل مستخدم",
  "user.disable": "إيقاف مستخدم",
}

/** Human Arabic label for an audit action — falls back to the raw string
 *  (never throws, never hides an unmapped event silently). */
export function actionLabelAr(action: string): string {
  return ACTION_LABELS_AR[action] ?? action
}
