/**
 * Shared display formatters. One source of truth so numbers/dates render
 * identically across every dashboard.
 *
 * Numbers use Arabic locale grouping with LATIN digits (0-9), because the
 * Arabic-Indic zero "٠" renders as a lone dot in KPI cards and reads as a
 * broken value ("٠" ≈ "·"). Latin digits are the norm in Saudi digital
 * products and stay legible at any size.
 */
const numberFmt = new Intl.NumberFormat("ar-SA-u-nu-latn")

export function nf(n: number): string {
  return numberFmt.format(n)
}

export function nfCurrency(n: number, currencyLabel: string): string {
  return `${numberFmt.format(n)} ${currencyLabel}`
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function df(d: Date | string): string {
  return dateFmt.format(typeof d === "string" ? new Date(d) : d)
}

const dateTimeFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export function dtf(d: Date | string): string {
  return dateTimeFmt.format(typeof d === "string" ? new Date(d) : d)
}

/** Strip the Arabic doctor honorific so greetings never render "أهلًا د.". */
export function firstNameOf(fullName: string): string {
  const cleaned = fullName.replace(/^\s*(د|دكتور|دكتوره|دكتورة|Dr)\.?\s*/i, "").trim()
  const first = cleaned.split(/\s+/)[0]
  return first || fullName.trim() || "بك"
}
