/**
 * Country flag emoji, derived purely from a 2-letter ISO-3166 code — never
 * stored. Each letter maps to a Unicode "regional indicator symbol"
 * (U+1F1E6..U+1F1FF, offset +127397 from its uppercase ASCII codepoint), and
 * two of them together render as that country's flag in every modern font.
 * Works for any valid code, so a newly-added country never needs anyone to
 * hunt down and paste an emoji by hand.
 */
export function flagFromCountryCode(code: string): string {
  const upper = code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return ""
  return String.fromCodePoint(
    ...Array.from(upper, (ch) => 127397 + ch.charCodeAt(0)),
  )
}

export type CountryPreset = {
  code: string
  nameAr: string
  nameEn: string
  callingCode: string
  currencyCode: string
  defaultLanguage: "ar" | "en" | "tr" | "fr"
  timezone: string
}

/**
 * Real reference data for countries this platform actually serves or is
 * likely to expand into (Gulf, Levant, wider MENA, Türkiye) — used only to
 * auto-fill the "add country" form so an admin picks a name instead of
 * typing five separate codes from memory. Editable after picking; not a
 * restriction on which countries can be added (manual entry always stays
 * available for anything not listed here).
 */
export const COUNTRY_PRESETS: CountryPreset[] = [
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", callingCode: "+966", currencyCode: "SAR", defaultLanguage: "ar", timezone: "Asia/Riyadh" },
  { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", callingCode: "+971", currencyCode: "AED", defaultLanguage: "ar", timezone: "Asia/Dubai" },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", callingCode: "+974", currencyCode: "QAR", defaultLanguage: "ar", timezone: "Asia/Qatar" },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", callingCode: "+965", currencyCode: "KWD", defaultLanguage: "ar", timezone: "Asia/Kuwait" },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", callingCode: "+973", currencyCode: "BHD", defaultLanguage: "ar", timezone: "Asia/Bahrain" },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman", callingCode: "+968", currencyCode: "OMR", defaultLanguage: "ar", timezone: "Asia/Muscat" },
  { code: "TR", nameAr: "تركيا", nameEn: "Türkiye", callingCode: "+90", currencyCode: "TRY", defaultLanguage: "tr", timezone: "Europe/Istanbul" },
  { code: "EG", nameAr: "مصر", nameEn: "Egypt", callingCode: "+20", currencyCode: "EGP", defaultLanguage: "ar", timezone: "Africa/Cairo" },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", callingCode: "+962", currencyCode: "JOD", defaultLanguage: "ar", timezone: "Asia/Amman" },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", callingCode: "+961", currencyCode: "LBP", defaultLanguage: "ar", timezone: "Asia/Beirut" },
  { code: "IQ", nameAr: "العراق", nameEn: "Iraq", callingCode: "+964", currencyCode: "IQD", defaultLanguage: "ar", timezone: "Asia/Baghdad" },
  { code: "SY", nameAr: "سوريا", nameEn: "Syria", callingCode: "+963", currencyCode: "SYP", defaultLanguage: "ar", timezone: "Asia/Damascus" },
  { code: "MA", nameAr: "المغرب", nameEn: "Morocco", callingCode: "+212", currencyCode: "MAD", defaultLanguage: "ar", timezone: "Africa/Casablanca" },
  { code: "TN", nameAr: "تونس", nameEn: "Tunisia", callingCode: "+216", currencyCode: "TND", defaultLanguage: "ar", timezone: "Africa/Tunis" },
  { code: "DZ", nameAr: "الجزائر", nameEn: "Algeria", callingCode: "+213", currencyCode: "DZD", defaultLanguage: "ar", timezone: "Africa/Algiers" },
  { code: "LY", nameAr: "ليبيا", nameEn: "Libya", callingCode: "+218", currencyCode: "LYD", defaultLanguage: "ar", timezone: "Africa/Tripoli" },
  { code: "SD", nameAr: "السودان", nameEn: "Sudan", callingCode: "+249", currencyCode: "SDG", defaultLanguage: "ar", timezone: "Africa/Khartoum" },
  { code: "YE", nameAr: "اليمن", nameEn: "Yemen", callingCode: "+967", currencyCode: "YER", defaultLanguage: "ar", timezone: "Asia/Aden" },
  { code: "PS", nameAr: "فلسطين", nameEn: "Palestine", callingCode: "+970", currencyCode: "ILS", defaultLanguage: "ar", timezone: "Asia/Gaza" },
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", callingCode: "+44", currencyCode: "GBP", defaultLanguage: "en", timezone: "Europe/London" },
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", callingCode: "+1", currencyCode: "USD", defaultLanguage: "en", timezone: "America/New_York" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", callingCode: "+33", currencyCode: "EUR", defaultLanguage: "fr", timezone: "Europe/Paris" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", callingCode: "+49", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Berlin" },
]
