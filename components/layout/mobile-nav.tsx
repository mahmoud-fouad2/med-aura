"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type NavLink = { href: string; label: string }

export function MobileNav({
  links,
  isAuthed,
  labels,
}: {
  links: NavLink[]
  isAuthed: boolean
  labels: { signIn: string; start: string; dashboard: string }
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="القائمة"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <Menu className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background p-4 shadow-lg">
            <div className="mb-2 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                {isAuthed ? (
                  <Button
                    render={
                      <Link href="/dashboard" onClick={() => setOpen(false)}>
                        {labels.dashboard}
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <Button
                      variant="outline"
                      render={
                        <Link href="/sign-in" onClick={() => setOpen(false)}>
                          {labels.signIn}
                        </Link>
                      }
                    />
                    <Button
                      render={
                        <Link href="/sign-up" onClick={() => setOpen(false)}>
                          {labels.start}
                        </Link>
                      }
                    />
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
