import type { ReactNode } from "react"
import { MobileDataCard } from "@/components/ui/mobile-data-card"

/**
 * The one admin list table. Was duplicated privately inside
 * app/admin/finance/page.tsx — promoted here so every admin list page
 * (users, centers, doctors, consultations, ...) shares the same desktop
 * table / mobile card behavior instead of hand-rolling its own <table>.
 */
export type DataTableColumn<T> = {
  header: string
  cell: (row: T) => ReactNode
  /** Which column doubles as the mobile card's title/badge. */
  mobile?: "title" | "badge"
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  onRowClick,
  actions,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  /** Defaults to array index — pass a real id when rows can reorder. */
  getRowKey?: (row: T, index: number) => string | number
  /** Makes each row (and mobile card) clickable, e.g. to open a details drawer. */
  onRowClick?: (row: T) => void
  /** Rendered as a trailing column (desktop) / card action slot (mobile). */
  actions?: (row: T) => ReactNode
}) {
  const titleCol = columns.find((c) => c.mobile === "title") ?? columns[0]
  const badgeCol = columns.find((c) => c.mobile === "badge")
  const rowCols = columns.filter((c) => c !== titleCol && c !== badgeCol)
  const keyFor = (row: T, i: number) => getRowKey?.(row, i) ?? i

  return (
    <>
      <div className="space-y-2 p-3 sm:hidden">
        {rows.map((row, i) => (
          <MobileDataCard
            key={keyFor(row, i)}
            title={titleCol.cell(row)}
            badge={badgeCol?.cell(row)}
            rows={rowCols.map((c) => ({ label: c.header, value: c.cell(row) }))}
            actions={actions?.(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
              {columns.map((c) => (
                <th key={c.header} className="px-4 py-2.5 text-start font-medium">
                  {c.header}
                </th>
              ))}
              {actions ? <th className="px-4 py-2.5 text-start font-medium">—</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, i) => (
              <tr
                key={keyFor(row, i)}
                className={
                  "transition-colors hover:bg-muted/25" + (onRowClick ? " cursor-pointer" : "")
                }
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.header} className="px-4 py-3">
                    {c.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
