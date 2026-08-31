/**
 * Money is never aggregated across currencies.
 *
 * Every money column stores the currency the transaction was actually charged
 * in, and the platform has no FX rate source — so `sum(amount)` over a mixed
 * set of rows produces a number that was never collected in any currency.
 * Labelling that number "ر.س" (as the finance cards and the dashboard KPI used
 * to) misreports revenue: a 50 USD consultation showed up as "50 ر.س".
 *
 * Totals that can span currencies are therefore carried as a per-currency
 * breakdown and rendered one currency at a time.
 */
import { currencyAr } from "@/lib/status-labels"
import type { DisplayLocale } from "@/lib/format"

/** The currency the platform prices in (the schema default on every money column). */
export const BASE_CURRENCY = "SAR"

export type MoneyTotal = { currency: string; amount: number }

export type CommissionSnapshot = {
  rate: string
  commissionAmount: string
  providerNetAmount: string
}

export function toMinorUnits(value: number | string): number {
  const normalized = String(value).trim()
  const match = normalized.match(/^-?(\d+)(?:\.(\d{0,2}))?$/)
  if (!match) throw new Error("Invalid monetary value")
  const sign = normalized.startsWith("-") ? -1 : 1
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? "").padEnd(2, "0"))
  return sign * (whole * 100 + fraction)
}

export function fromMinorUnits(value: number): string {
  return (value / 100).toFixed(2)
}

/** Snapshot platform economics without floating-point money arithmetic. */
export function calculateCommissionSnapshot(
  subtotal: number | string,
  total: number | string,
  rate: number | string,
): CommissionSnapshot {
  const subtotalMinor = toMinorUnits(subtotal)
  const totalMinor = toMinorUnits(total)
  const rateBasisPoints = toMinorUnits(rate)
  if (subtotalMinor < 0 || totalMinor < 0 || rateBasisPoints < 0 || rateBasisPoints > 10_000) {
    throw new Error("Commission inputs are out of range")
  }

  const commissionMinor = Math.round((subtotalMinor * rateBasisPoints) / 10_000)
  return {
    rate: (rateBasisPoints / 100).toFixed(2),
    commissionAmount: fromMinorUnits(commissionMinor),
    providerNetAmount: fromMinorUnits(Math.max(0, totalMinor - commissionMinor)),
  }
}

const NUM = new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })
const NUM_EN = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })

const CURRENCY_EN: Record<string, string> = {
  SAR: "SAR",
  USD: "USD",
  EUR: "EUR",
  AED: "AED",
  TRY: "TRY",
}

/** "50 ر.س" — Latin digits, matching the rest of the product's number rendering. */
export function formatMoney(
  amount: number | string,
  currency: string,
  locale: DisplayLocale = "ar",
): string {
  const value = Number(amount) || 0
  return locale === "ar"
    ? `${NUM.format(value)} ${currencyAr(currency)}`
    : `${NUM_EN.format(value)} ${CURRENCY_EN[currency] ?? currency}`
}

/** Base currency first, then descending by amount, dropping zero rows. */
export function sortTotals(totals: MoneyTotal[]): MoneyTotal[] {
  return totals
    .filter((t) => t.amount !== 0)
    .sort((a, b) => {
      if (a.currency === b.currency) return 0
      if (a.currency === BASE_CURRENCY) return -1
      if (b.currency === BASE_CURRENCY) return 1
      return Math.abs(b.amount) - Math.abs(a.amount)
    })
}

/** Sum of a single currency only — used where a figure must stay comparable. */
export function totalIn(totals: MoneyTotal[], currency: string): number {
  return totals.find((t) => t.currency === currency)?.amount ?? 0
}

/** True when the totals span more than one currency and so cannot be added up. */
export function isMixedCurrency(totals: MoneyTotal[]): boolean {
  return sortTotals(totals).length > 1
}

/** Whether any money at all was recorded. */
export function hasMoney(totals: MoneyTotal[]): boolean {
  return sortTotals(totals).length > 0
}

/**
 * A headline figure for a metric card: one currency in the big number, the
 * remaining currencies spelled out beside it rather than folded into it.
 */
export function headlineTotal(totals: MoneyTotal[]): { value: string; others: string | null } {
  const sorted = sortTotals(totals)
  if (sorted.length === 0) return { value: formatMoney(0, BASE_CURRENCY), others: null }
  const primary = sorted[0]
  if (!primary) return { value: formatMoney(0, BASE_CURRENCY), others: null }
  const rest = sorted.slice(1)
  return {
    value: formatMoney(primary.amount, primary.currency),
    others: rest.length ? rest.map((t) => formatMoney(t.amount, t.currency)).join(" · ") : null,
  }
}

/** Every currency inline, e.g. "300 ر.س · 50 $". For dense one-line contexts. */
export function formatTotals(totals: MoneyTotal[]): string {
  const sorted = sortTotals(totals)
  if (sorted.length === 0) return formatMoney(0, BASE_CURRENCY)
  return sorted.map((t) => formatMoney(t.amount, t.currency)).join(" · ")
}
