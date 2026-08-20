"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronDown, Bell } from "lucide-react"
import { Logo, LogoMark } from "@/components/brand/logo"
import { AdminIcon } from "@/components/admin/admin-icon"
import { CommandPalette } from "@/components/admin/command-palette"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { AdminNavGroup } from "@/lib/admin-nav"

export function AdminShell({
  user,
  nav,
  unreadNotifications = 0,
  children,
}: {
  user: { name: string; email: string }
  nav: AdminNavGroup[]
  unreadNotifications?: number
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const activeLabel = nav
    .flatMap((g) => g.items)
    .find((i) => {
      const base = i.href.split("#")[0] ?? i.href
      return i.href === "/admin" ? pathname === i.href : pathname.startsWith(base)
    })?.label

  return (
    <div className="bg-muted/30 flex min-h-svh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "border-border/70 bg-card ease-premium sticky top-4 my-4 ms-4 hidden h-[calc(100svh-2rem)] shrink-0 flex-col rounded-xl border shadow-sm transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarInner nav={nav} pathname={pathname} collapsed={collapsed} user={user} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="border-sidebar-border/70 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center justify-center gap-2 border-t py-3 text-sm transition-colors"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "طي القائمة"}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[248px] p-0" showCloseButton>
          {/* SidebarInner renders its own bordered logo header below — this
              title exists only so the dialog has an accessible name, not to
              be seen (it was duplicating the same logo a second time). */}
          <SheetHeader className="sr-only">
            <SheetTitle>القائمة</SheetTitle>
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
        <header className="sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6">
          <div className="border-border/70 bg-background flex h-16 items-center gap-3 rounded-xl border px-4 shadow-sm sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="فتح القائمة"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <div className="text-muted-foreground hidden items-center gap-1.5 text-xs md:flex">
              <Link href="/admin" className="hover:text-foreground">
                الإدارة
              </Link>
              {activeLabel && activeLabel !== "نظرة عامة" && (
                <>
                  <ChevronLeft className="size-3 transition-transform duration-300 ltr:rotate-180 rtl:rotate-0" />
                  <span className="bg-secondary text-foreground rounded-full px-2.5 py-1 font-semibold">
                    {activeLabel}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-heading text-foreground text-base font-bold md:hidden">
              {activeLabel ?? "الإدارة"}
            </h1>

            <div className="flex-1" />

            <div className="hidden w-full max-w-xs md:block">
              <CommandPalette nav={nav} />
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/notifications"
                aria-label="الإشعارات"
                className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex size-9 items-center justify-center rounded-lg transition-colors"
              >
                <Bell className="size-[18px]" />
                {unreadNotifications > 0 && (
                  <span className="bg-destructive text-destructive-foreground absolute end-1 top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <ThemeToggle />
              <UserMenu name={user.name} email={user.email} />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 xl:px-8">{children}</main>
      </div>
    </div>
  )
}

function isActiveHref(href: string, pathname: string): boolean {
  const base = href.split("#")[0] ?? href
  return base === "/admin" ? pathname === "/admin" : pathname.startsWith(base)
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
  const activeGroup = nav.find((g) => g.items.some((i) => isActiveHref(i.href, pathname)))?.title
  // Recreated whenever the active group changes (e.g. navigating from one
  // section to another) so the sidebar always opens on wherever you are,
  // while still letting the user freely open/close any other group by hand.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  )
  const [lastActiveGroup, setLastActiveGroup] = useState(activeGroup)
  if (activeGroup !== lastActiveGroup) {
    setLastActiveGroup(activeGroup)
    if (activeGroup) setOpenGroups((prev) => new Set(prev).add(activeGroup))
  }

  function toggleGroup(title: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div className="text-sidebar-foreground flex h-full flex-col bg-transparent">
      <div
        className={cn(
          "border-sidebar-border/70 flex h-16 items-center border-b px-3.5",
          collapsed && "justify-center px-2",
        )}
      >
        <Link
          href="/admin"
          aria-label="Med Aura"
          onClick={onNavigate}
          className="flex items-center gap-3"
        >
          {collapsed ? <LogoMark className="text-primary size-7" /> : <Logo className="h-7" />}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-primary/70 text-[11px] font-semibold tracking-[0.18em] uppercase">
                إدارة المنصة
              </p>
              <p className="text-foreground truncate text-sm font-bold">لوحة الإدارة</p>
            </div>
          )}
        </Link>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {nav.map((group) => {
          // Collapsed rail or a single-item group: a plain link, no
          // accordion chrome — there's nothing meaningful to collapse.
          if (collapsed || group.items.length === 1) {
            return group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActiveHref(item.href, pathname)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))
          }

          const open = openGroups.has(group.title)
          return (
            <div key={group.title}>
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={open}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold tracking-wide transition-colors",
                  group.title === activeGroup
                    ? "text-primary"
                    : "text-foreground/75 hover:text-foreground",
                )}
              >
                <span className="flex-1 truncate text-start">{group.title}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <ul className="space-y-0.5 pb-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={isActiveHref(item.href, pathname)}
                        collapsed={false}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
      <div
        className={cn(
          "border-sidebar-border border-t p-1.5",
          collapsed && "flex justify-center p-1.5",
        )}
      >
        {collapsed ? (
          <UserMenu name={user.name} email={user.email} />
        ) : (
          <UserMenu name={user.name} email={user.email} layout="row" />
        )}
      </div>
    </div>
  )
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: AdminNavGroup["items"][number]
  active: boolean
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
        collapsed && "mb-0.5 justify-center px-0",
        active
          ? "bg-primary/12 text-primary shadow-primary/10 font-bold shadow-sm"
          : "text-foreground/70 hover:bg-secondary/85 hover:text-foreground font-medium",
      )}
    >
      {active && <span className="bg-primary absolute inset-y-1.5 -start-2.5 w-1 rounded-full" />}
      <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}
