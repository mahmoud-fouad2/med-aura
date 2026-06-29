"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export type NavLink = { href: string; label: string }

/** Dashboard/admin nav with active-route highlighting. */
export function NavLinks({
  links,
  className,
  itemClassName,
}: {
  links: NavLink[]
  className?: string
  itemClassName?: string
}) {
  const pathname = usePathname()

  return (
    <nav className={className}>
      {links.map((l) => {
        const active =
          l.href === "/dashboard" || l.href === "/admin"
            ? pathname === l.href
            : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              itemClassName,
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
