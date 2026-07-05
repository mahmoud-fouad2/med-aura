"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/brand/logo"

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
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    document.body.classList.add("overflow-hidden")
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.classList.remove("overflow-hidden")
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="القائمة"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground transition-colors hover:bg-muted"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 z-40 bg-foreground/30 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div
            id="mobile-nav-panel"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-b-3xl border-b border-border/70 bg-background shadow-[0_16px_48px_-12px_rgba(20,20,60,0.24)] animate-in fade-in-0 slide-in-from-top-4 duration-200"
          >
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LogoMark className="size-5" />
                </span>
                <div>
                  <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                    Med Aura
                  </p>
                  <p className="text-xs text-muted-foreground">
                    قائمة التنقل
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="p-3">
              <ul className="space-y-0.5">
                {links.map((link) => {
                  const active =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href)
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={
                          "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                          (active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted")
                        }
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={
                              "size-1.5 rounded-full " +
                              (active
                                ? "bg-primary"
                                : "bg-transparent transition-colors group-hover:bg-primary/40")
                            }
                          />
                          {link.label}
                        </span>
                        <ChevronLeft
                          className={
                            "size-4 rtl:rotate-0 ltr:rotate-180 transition-transform " +
                            (active
                              ? "text-primary rtl:-translate-x-0.5 ltr:translate-x-0.5"
                              : "text-muted-foreground/60 group-hover:text-primary")
                          }
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* CTA block */}
              <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                {isAuthed ? (
                  <Button
                    className="w-full"
                    render={
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                      >
                        {labels.dashboard}
                        <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <Button
                      className="w-full"
                      render={
                        <Link
                          href="/sign-up"
                          onClick={() => setOpen(false)}
                        >
                          <Sparkles className="size-4" />
                          {labels.start}
                        </Link>
                      }
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      render={
                        <Link
                          href="/sign-in"
                          onClick={() => setOpen(false)}
                        >
                          {labels.signIn}
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
