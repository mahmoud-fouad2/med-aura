"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, PanelLeftClose, PanelLeftOpen, ChevronLeft, Bell } from "lucide-react"
import { Logo, LogoMark } from "@/components/brand/logo"
import { AdminIcon } from "@/components/admin/admin-icon"
import { CommandPalette } from "@/components/admin/command-palette"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { AdminNavGroup } from "@/lib/admin-nav"
import type { Locale } from "@/lib/i18n/config"

export function AdminShell({
  user,
  nav,
  locale,
  unreadNotifications = 0,
  children,
}: {
  user: { name: string; email: string }
  nav: AdminNavGroup[]
  locale: Locale
  unreadNotifications?: number
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const activeLabel = nav
    .flatMap((g) => g.items)
    .find((i) => (i.href === "/admin" ? pathname === i.href : pathname.startsWith(i.href.split("#")[0])))
    ?.label

  return (
    <div className="flex min-h-svh bg-section-soft">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-e border-sidebar-border bg-card/92 shadow-elegant ease-premium transition-[width] duration-200 backdrop-blur md:flex",
          collapsed ? "w-[76px]" : "w-72",
        )}
      >
        <SidebarInner nav={nav} pathname={pathname} collapsed={collapsed} user={user} />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center gap-2 border-t border-sidebar-border py-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "طي القائمة"}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0" showCloseButton>
          <SheetHeader className="border-b border-border">
            <SheetTitle>
              <Link href="/admin" onClick={() => setMobileOpen(false)}>
                <Logo className="h-8" />
              </Link>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarInner
              nav={nav}
              pathname={pathname}
              collapsed={false}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 bg-background/72 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl">
          <div className="flex h-[4.5rem] items-center gap-3 rounded-[1.45rem] border border-border/70 bg-card/92 px-4 shadow-elegant sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="فتح القائمة"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
              <Link href="/admin" className="hover:text-foreground">الإدارة</Link>
              {activeLabel && activeLabel !== "نظرة عامة" && (
                <>
                  <ChevronLeft className="size-3.5 transition-transform duration-300 rtl:rotate-0 ltr:rotate-180" />
                  <span className="font-medium text-foreground">{activeLabel}</span>
                </>
              )}
            </div>

            <h1 className="font-heading text-lg font-bold text-foreground md:hidden">
              {activeLabel ?? "الإدارة"}
            </h1>

            <div className="mx-2 flex-1">
              <CommandPalette nav={nav} />
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/notifications"
                aria-label="الإشعارات"
                className="relative flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Bell className="size-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <ThemeToggle />
              <LanguageSwitcher locale={locale} />
              <UserMenu name={user.name} email={user.email} />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

function SidebarInner({
  nav,
  pathname,
  collapsed,
  user,
  onNavigate,
}: {
  nav: AdminNavGroup[]
  pathname: string
  collapsed: boolean
  user: { name: string; email: string }
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-card/92 text-sidebar-foreground">
      <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
        <Link href="/admin" aria-label="Med Aura" onClick={onNavigate}>
          {collapsed ? <LogoMark className="size-8 text-primary" /> : <Logo className="h-8" />}
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {nav.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-xs font-semibold text-muted-foreground">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const baseHref = item.href.split("#")[0]
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(baseHref)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-primary",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1 -start-3 w-1 rounded-full bg-primary" />
                      )}
                      <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={cn("border-t border-sidebar-border p-2", collapsed && "flex justify-center p-2")}>
        {collapsed ? (
          <UserMenu name={user.name} email={user.email} />
        ) : (
          <UserMenu name={user.name} email={user.email} layout="row" />
        )}
      </div>
    </div>
  )
}
