"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronsUpDown, LayoutDashboard, LogOut } from "lucide-react"

export function UserMenu({
  name,
  email,
  layout = "icon",
}: {
  name: string
  email: string
  /** "row" renders a full-width trigger (avatar + name/email + chevron) for
   *  a sidebar footer; "icon" is the compact header trigger. */
  layout?: "icon" | "row"
}) {
  const router = useRouter()
  const initials = name?.trim()?.charAt(0)?.toUpperCase() || "م"

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          layout === "row" ? (
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2.5 rounded-xl px-2 py-2"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-sm font-medium text-foreground">
                  {name}
                </span>
                <span dir="ltr" className="block truncate text-end text-xs text-muted-foreground">
                  {email}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          )
        }
      />
      <DropdownMenuContent
        align={layout === "row" ? "start" : "end"}
        side={layout === "row" ? "top" : "bottom"}
        className="w-56"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{name}</span>
            <span dir="ltr" className="truncate text-right text-xs text-muted-foreground">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard className="size-4" />
          لوحة التحكم
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
