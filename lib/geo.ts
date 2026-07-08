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
 * Reference data for auto-filling the "add country" form — a hand-verified
 * local dataset, not a runtime call to a third-party API (would add latency
 * and an external failure mode for zero benefit; these facts don't change).
 * Deliberately not a full ISO-3166 list (~195 countries): a generic package
 * covering all of them is 100KB+ of mostly-irrelevant data and still lacks
 * Arabic names, which we need to hand-verify either way. Covers the Gulf,
 * wider Arab world, and the other markets this platform's patients travel
 * from/to. Manual entry stays available for anything not listed here — this
 * is a head start, not a restriction on which countries can be added.
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
  { code: "MR", nameAr: "موريتانيا", nameEn: "Mauritania", callingCode: "+222", currencyCode: "MRU", defaultLanguage: "ar", timezone: "Africa/Nouakchott" },
  { code: "SO", nameAr: "الصومال", nameEn: "Somalia", callingCode: "+252", currencyCode: "SOS", defaultLanguage: "ar", timezone: "Africa/Mogadishu" },
  { code: "DJ", nameAr: "جيبوتي", nameEn: "Djibouti", callingCode: "+253", currencyCode: "DJF", defaultLanguage: "ar", timezone: "Africa/Djibouti" },
  { code: "KM", nameAr: "جزر القمر", nameEn: "Comoros", callingCode: "+269", currencyCode: "KMF", defaultLanguage: "ar", timezone: "Indian/Comoro" },
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", callingCode: "+44", currencyCode: "GBP", defaultLanguage: "en", timezone: "Europe/London" },
  { code: "IE", nameAr: "أيرلندا", nameEn: "Ireland", callingCode: "+353", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Dublin" },
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", callingCode: "+1", currencyCode: "USD", defaultLanguage: "en", timezone: "America/New_York" },
  { code: "CA", nameAr: "كندا", nameEn: "Canada", callingCode: "+1", currencyCode: "CAD", defaultLanguage: "en", timezone: "America/Toronto" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", callingCode: "+33", currencyCode: "EUR", defaultLanguage: "fr", timezone: "Europe/Paris" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", callingCode: "+49", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Berlin" },
  { code: "ES", nameAr: "إسبانيا", nameEn: "Spain", callingCode: "+34", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Madrid" },
  { code: "IT", nameAr: "إيطاليا", nameEn: "Italy", callingCode: "+39", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Rome" },
  { code: "CH", nameAr: "سويسرا", nameEn: "Switzerland", callingCode: "+41", currencyCode: "CHF", defaultLanguage: "en", timezone: "Europe/Zurich" },
  { code: "NL", nameAr: "هولندا", nameEn: "Netherlands", callingCode: "+31", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Amsterdam" },
  { code: "AT", nameAr: "النمسا", nameEn: "Austria", callingCode: "+43", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Vienna" },
  { code: "GR", nameAr: "اليونان", nameEn: "Greece", callingCode: "+30", currencyCode: "EUR", defaultLanguage: "en", timezone: "Europe/Athens" },
  { code: "PK", nameAr: "باكستان", nameEn: "Pakistan", callingCode: "+92", currencyCode: "PKR", defaultLanguage: "en", timezone: "Asia/Karachi" },
  { code: "IN", nameAr: "الهند", nameEn: "India", callingCode: "+91", currencyCode: "INR", defaultLanguage: "en", timezone: "Asia/Kolkata" },
  { code: "BD", nameAr: "بنغلاديش", nameEn: "Bangladesh", callingCode: "+880", currencyCode: "BDT", defaultLanguage: "en", timezone: "Asia/Dhaka" },
  { code: "PH", nameAr: "الفلبين", nameEn: "Philippines", callingCode: "+63", currencyCode: "PHP", defaultLanguage: "en", timezone: "Asia/Manila" },
  { code: "ID", nameAr: "إندونيسيا", nameEn: "Indonesia", callingCode: "+62", currencyCode: "IDR", defaultLanguage: "en", timezone: "Asia/Jakarta" },
  { code: "MY", nameAr: "ماليزيا", nameEn: "Malaysia", callingCode: "+60", currencyCode: "MYR", defaultLanguage: "en", timezone: "Asia/Kuala_Lumpur" },
]

/**
 * Every IANA timezone identifier the current JS runtime knows about — native
 * `Intl` API (Node 18+/modern browsers), zero dependencies, always accurate
 * because it comes from the same tzdata the server itself uses.
 */
export function listIanaTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone")
  }
  return []
}
