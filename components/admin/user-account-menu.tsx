"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Power, LogOut, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { toggleUserStatusAction, revokeUserSessionsAction, adminRequestPasswordResetAction } from "@/lib/actions/users"

type ActiveDialog = "status" | "signout" | "reset" | null

/**
 * Grouped account actions for one user row — activate/disable, force
 * sign-out, admin password-reset — behind a single "more actions" menu
 * instead of a row of icon buttons (spec: "Actions menu بدل ازدحام الأزرار").
 * Editing profile fields lives in the drawer's own "تعديل" tab (UserEditForm),
 * not here — these are account-security actions, not profile data.
 *
 * Every dialog is rendered as a SIBLING of the DropdownMenu, not nested
 * inside it: selecting a menu item closes the menu, which would unmount
 * anything nested in its popup (including a dialog) before it ever opens.
 * The menu items just set `activeDialog`; the dialogs below read it back.
 */
export function UserAccountMenu({
  userId,
  userName,
  isActive,
  isSelf,
}: {
  userId: string
  userName: string
  isActive: boolean
  isSelf: boolean
}) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const router = useRouter()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`خيارات ${userName}`} />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            variant={isActive ? "destructive" : "default"}
            onClick={() => setActiveDialog("status")}
          >
            <Power className="size-4" /> {isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("signout")}>
            <LogOut className="size-4" /> تسجيل خروج من كل الأجهزة
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("reset")}>
            <KeyRound className="size-4" /> إرسال رابط إعادة تعيين كلمة المرور
          </DropdownMenuItem>
          {isSelf && (
            <p className="px-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
              هذا حسابك — لا يمكنك تعطيل نفسك.
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={activeDialog === "status"}
        onOpenChange={(o) => setActiveDialog(o ? "status" : null)}
        title={isActive ? `تعطيل حساب ${userName}؟` : `تفعيل حساب ${userName}؟`}
        description={
          isActive
            ? "لن يتمكن هذا المستخدم من تسجيل الدخول أو استخدام المنصة، وستُنهى جلساته الحالية فورًا."
            : "سيستعيد هذا المستخدم القدرة على تسجيل الدخول واستخدام المنصة."
        }
        confirmLabel={isActive ? "تعطيل" : "تفعيل"}
        tone={isActive ? "destructive" : "default"}
        onConfirm={async () => {
          const res = await toggleUserStatusAction({ userId, active: !isActive })
          if (res.status === "ok") {
            toast.success(res.message)
            router.refresh()
            return true
          }
          toast.error(res.message)
          return false
        }}
      />

      <ConfirmDialog
        open={activeDialog === "signout"}
        onOpenChange={(o) => setActiveDialog(o ? "signout" : null)}
        title={`تسجيل خروج ${userName} من كل الأجهزة؟`}
        description="سيُطلب منه تسجيل الدخول مرة أخرى في المرة القادمة على كل جهاز يستخدمه."
        confirmLabel="تسجيل الخروج"
        onConfirm={async () => {
          const res = await revokeUserSessionsAction(userId)
          if (res.status === "ok") {
            toast.success(res.message)
            return true
          }
          toast.error(res.message)
          return false
        }}
      />

      <ConfirmDialog
        open={activeDialog === "reset"}
        onOpenChange={(o) => setActiveDialog(o ? "reset" : null)}
        title={`إرسال رابط إعادة تعيين كلمة المرور إلى ${userName}؟`}
        description="سيصل رابط آمن لتعيين كلمة مرور جديدة إلى بريده الإلكتروني المسجَّل."
        confirmLabel="إرسال الرابط"
        onConfirm={async () => {
          const res = await adminRequestPasswordResetAction(userId)
          if (res.status === "ok") {
            toast.success(res.message)
            return true
          }
          toast.error(res.message)
          return false
        }}
      />
    </>
  )
}
