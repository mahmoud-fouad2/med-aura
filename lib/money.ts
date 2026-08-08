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

/** The currency the platform prices in (the schema default on every money column). */
export const BASE_CURRENCY = "SAR"

export type MoneyTotal = { currency: string; amount: number }

const NUM = new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })

/** "50 ر.س" — Latin digits, matching the rest of the product's number rendering. */
export function formatMoney(amount: number | string, currency: string): string {
  return `${NUM.format(Number(amount) || 0)} ${currencyAr(currency)}`
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
  const [primary, ...rest] = sorted
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
