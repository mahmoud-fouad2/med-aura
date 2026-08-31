"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { NavLinks } from "@/components/layout/nav-links"
import type { ShellNavLink } from "@/components/layout/app-shell"

/**
 * Mobile nav for the patient/doctor/center dashboard shell — same Sheet
 * primitive the admin panel already uses for its own mobile drawer, replacing
 * the old raw <details>/<summary> toggle (no animation, inconsistent native
 * styling across browsers).
 */
export function DashboardMobileNav({
  nav,
  label,
}: {
  nav: ShellNavLink[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="border-t border-border/60 md:hidden">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 rounded-none px-1 py-2 text-sm font-semibold text-foreground hover:bg-transparent"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4 text-primary" />
        {label}
        <span className="ms-auto text-xs text-muted-foreground">{nav.length}</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[260px] p-0" showCloseButton>
          <SheetHeader className="border-b border-border/60">
            <SheetTitle className="text-start text-sm">{label}</SheetTitle>
          </SheetHeader>
          <NavLinks links={nav} className="flex flex-col gap-1 p-3" itemClassName="w-full justify-start" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
