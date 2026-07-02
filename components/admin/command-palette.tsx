"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  Search,
  FileHeart,
  Users,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  Stethoscope,
  Building2,
  ClipboardCheck,
  Wallet,
  Bell,
  Sparkles,
  Globe2,
  UserCog,
  History,
  Activity,
  Settings2,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import type { AdminNavGroup } from "@/lib/admin-nav"

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileHeart,
  Users,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  Stethoscope,
  Building2,
  ClipboardCheck,
  Wallet,
  Bell,
  Sparkles,
  Globe2,
  UserCog,
  History,
  Activity,
  Settings2,
}

export function CommandPalette({ nav }: { nav: AdminNavGroup[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح لوحة الأوامر (Ctrl+K)"
        className="group hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:inline-flex"
      >
        <Search className="size-4" />
        <span>ابحث أو انتقل بسرعة…</span>
        <kbd className="ms-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <Command
            label="لوحة الأوامر"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in zoom-in-95 fade-in-0 slide-in-from-top-4"
          >
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="اكتب اسم الصفحة، مريض، حالة…"
                className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </Command.Empty>
              {nav.map((group) => (
                <Command.Group
                  key={group.title}
                  heading={group.title}
                  className="[&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {group.items.map((item) => {
                    const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
                    return (
                      <Command.Item
                        key={item.href}
                        value={`${item.label} ${item.href}`}
                        onSelect={() => go(item.href)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground group-data-[selected=true]:text-primary" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {item.href}
                        </span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              ))}
            </Command.List>
            <div className="border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
              انتقل بالأسهم • Enter للفتح • Ctrl+K للتبديل
            </div>
          </Command>
        </div>
      )}
    </>
  )
}
