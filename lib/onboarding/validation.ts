import { validation } from "@/lib/errors"

export function normalizeSignupPhone(phone: string, residenceCountry: string): string {
  const compact = phone.replace(/[\s\-()]/g, "")
  let normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact

  if (residenceCountry === "SA") {
    if (/^05\d{8}$/.test(compact)) normalized = `+966${compact.slice(1)}`
    if (/^5\d{8}$/.test(compact)) normalized = `+966${compact}`
    if (/^9665\d{8}$/.test(compact)) normalized = `+${compact}`
  }

  if (!normalized.startsWith("+") && /^\d{8,15}$/.test(normalized)) {
    normalized = `+${normalized}`
  }

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw validation("رقم الهاتف غير صالح. استخدم الصيغة الدولية مثل +9665xxxxxxxx.")
  }

  return normalized
}
