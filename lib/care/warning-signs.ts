/**
 * Fixed, non-diagnostic warning-sign checklist shared by the patient-facing
 * symptom report form and the server-side safety-alert action. The system
 * NEVER infers or displays a diagnosis — selecting any of these only routes a
 * safety alert to the care team for human review; it is not medical advice.
 */
export const WARNING_SIGNS: { key: string; labelAr: string; critical?: boolean }[] = [
  { key: "heavy_bleeding", labelAr: "نزيف غزير لا يتوقف", critical: true },
  { key: "difficulty_breathing", labelAr: "صعوبة في التنفس", critical: true },
  { key: "chest_pain", labelAr: "ألم في الصدر", critical: true },
  { key: "high_fever", labelAr: "حرارة مرتفعة (39° فأكثر)" },
  { key: "severe_pain", labelAr: "ألم شديد لا يستجيب للمسكنات" },
  { key: "wound_infection", labelAr: "احمرار أو صديد أو رائحة من مكان الجرح" },
  { key: "allergic_reaction", labelAr: "طفح جلدي أو تورم يوحي بحساسية" },
  { key: "fainting", labelAr: "إغماء أو دوخة شديدة" },
]
