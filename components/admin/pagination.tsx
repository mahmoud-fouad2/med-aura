import Link from "next/link"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Server-rendered pagination: builds plain hrefs from the current search
 * params so it works with zero client JS and preserves every other filter.
 */
export function AdminPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  buildHref,
}: {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  buildHref: (page: number) => string
}) {
  if (totalCount === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <p>
        عرض <span className="font-medium text-foreground">{from}–{to}</span> من{" "}
        <span className="font-medium text-foreground">{totalCount}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} aria-label="الصفحة السابقة">
          <ChevronRight className="size-4" />
        </PageLink>
        <span className="px-2 text-xs">
          {page} / {totalPages}
        </span>
        <PageLink href={buildHref(page + 1)} disabled={page >= totalPages} aria-label="الصفحة التالية">
          <ChevronLeft className="size-4" />
        </PageLink>
      </div>
    </div>
  )
}

function PageLink({
  href,
  disabled,
  children,
  "aria-label": ariaLabel,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
  "aria-label": string
}) {
  const classes = cn(
    "flex size-8 items-center justify-center rounded-lg border border-border transition-colors",
    disabled
      ? "pointer-events-none opacity-40"
      : "hover:bg-muted hover:text-foreground",
  )
  if (disabled) {
    return (
      <span className={classes} aria-hidden="true">
        {children}
      </span>
    )
  }
  return (
    <Link href={href} aria-label={ariaLabel} className={classes}>
      {children}
    </Link>
  )
}
