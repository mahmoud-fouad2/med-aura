/**
 * Multi-currency support and dynamic conversion rates for Med Aura.
 * Supports Gulf (GCC), MENA, and international aesthetic medicine destinations.
 */

export type SupportedCurrency =
  | "SAR"
  | "AED"
  | "KWD"
  | "BHD"
  | "OMR"
  | "QAR"
  | "EGP"
  | "USD"
  | "EUR"
  | "TRY"
  | "GBP"

export interface CurrencyMetadata {
  code: SupportedCurrency
  nameAr: string
  nameEn: string
  symbolAr: string
  symbolEn: string
  rateToUSD: number // Base rate relative to 1 USD
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyMetadata> = {
  SAR: {
    code: "SAR",
    nameAr: "ريال سعودي",
    nameEn: "Saudi Riyal",
    symbolAr: "ر.س",
    symbolEn: "SAR",
    rateToUSD: 3.75,
  },
  AED: {
    code: "AED",
    nameAr: "درهم إماراتي",
    nameEn: "UAE Dirham",
    symbolAr: "د.إ",
    symbolEn: "AED",
    rateToUSD: 3.67,
  },
  KWD: {
    code: "KWD",
    nameAr: "دينار كويتي",
    nameEn: "Kuwaiti Dinar",
    symbolAr: "د.ك",
    symbolEn: "KWD",
    rateToUSD: 0.31,
  },
  BHD: {
    code: "BHD",
    nameAr: "دينار بحريني",
    nameEn: "Bahraini Dinar",
    symbolAr: "د.ب",
    symbolEn: "BHD",
    rateToUSD: 0.38,
  },
  OMR: {
    code: "OMR",
    nameAr: "ريال عماني",
    nameEn: "Omani Rial",
    symbolAr: "ر.ع",
    symbolEn: "OMR",
    rateToUSD: 0.385,
  },
  QAR: {
    code: "QAR",
    nameAr: "ريال قطري",
    nameEn: "Qatari Riyal",
    symbolAr: "ر.ق",
    symbolEn: "QAR",
    rateToUSD: 3.64,
  },
  EGP: {
    code: "EGP",
    nameAr: "جنيه مصري",
    nameEn: "Egyptian Pound",
    symbolAr: "ج.م",
    symbolEn: "EGP",
    rateToUSD: 48.5,
  },
  USD: {
    code: "USD",
    nameAr: "دولار أمريكي",
    nameEn: "US Dollar",
    symbolAr: "$",
    symbolEn: "USD",
    rateToUSD: 1.0,
  },
  EUR: {
    code: "EUR",
    nameAr: "يورو",
    nameEn: "Euro",
    symbolAr: "€",
    symbolEn: "EUR",
    rateToUSD: 0.92,
  },
  TRY: {
    code: "TRY",
    nameAr: "ليرة تركية",
    nameEn: "Turkish Lira",
    symbolAr: "₺",
    symbolEn: "TRY",
    rateToUSD: 33.5,
  },
  GBP: {
    code: "GBP",
    nameAr: "جنيه إسترليني",
    nameEn: "British Pound",
    symbolAr: "£",
    symbolEn: "GBP",
    rateToUSD: 0.78,
  },
}

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return code in CURRENCIES
}

/**
 * Convert an amount from one currency to another using exchange rates.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
): number {
  const fromUpper = from.toUpperCase() as SupportedCurrency
  const toUpper = to.toUpperCase() as SupportedCurrency

  if (fromUpper === toUpper) return amount

  const fromMeta = CURRENCIES[fromUpper]
  const toMeta = CURRENCIES[toUpper]

  if (!fromMeta || !toMeta) return amount

  // Convert to USD base first, then to target currency
  const inUSD = amount / fromMeta.rateToUSD
  const inTarget = inUSD * toMeta.rateToUSD

  // Round appropriately (KWD/BHD/OMR usually 3 decimals, others 2 or 0)
  if (toUpper === "KWD" || toUpper === "BHD" || toUpper === "OMR") {
    return Math.round(inTarget * 1000) / 1000
  }
  return Math.round(inTarget * 100) / 100
}

/**
 * Format a price with its primary currency and optional estimated conversion.
 */
export function formatCurrencyPrice(
  amount: number | string,
  currency: string,
  locale: "ar" | "en" = "ar",
  options?: { showApproxIn?: SupportedCurrency },
): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) || 0 : amount
  const code = (currency.toUpperCase() as SupportedCurrency) || "SAR"
  const meta = CURRENCIES[code]

  const symbol = locale === "ar" ? meta?.symbolAr ?? code : meta?.symbolEn ?? code
  const formattedNum = num.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 2,
  })

  const primary = `${formattedNum} ${symbol}`

  if (options?.showApproxIn && options.showApproxIn !== code) {
    const approxAmount = convertCurrency(num, code, options.showApproxIn)
    const approxMeta = CURRENCIES[options.showApproxIn]
    const approxSymbol =
      locale === "ar" ? approxMeta?.symbolAr ?? options.showApproxIn : approxMeta?.symbolEn ?? options.showApproxIn
    const approxFormatted = approxAmount.toLocaleString(
      locale === "ar" ? "ar-SA" : "en-US",
      { maximumFractionDigits: 2 },
    )
    const approxLabel = locale === "ar" ? "تقريباً" : "approx."
    return `${primary} (${approxLabel} ${approxFormatted} ${approxSymbol})`
  }

  return primary
}
