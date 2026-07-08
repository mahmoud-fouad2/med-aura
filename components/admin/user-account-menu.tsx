"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  MoreVertical,
  Pencil,
  Power,
  LogOut,
  KeyRound,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FormDialog } from "@/components/ui/form-dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  updateUserAction,
  toggleUserStatusAction,
  revokeUserSessionsAction,
  adminRequestPasswordResetAction,
} from "@/lib/actions/users"

type ActiveDialog = "edit" | "status" | "signout" | "reset" | null

/**
 * Grouped account actions for one user row — edit, activate/disable, force
 * sign-out, admin password-reset — behind a single "more actions" menu
 * instead of a row of icon buttons (spec: "Actions menu بدل ازدحام الأزرار").
 *
 * Every dialog is rendered as a SIBLING of the DropdownMenu, not nested
 * inside it: selecting a menu item closes the menu, which would unmount
 * anything nested in its popup (including a dialog) before it ever opens.
 * The menu items just set `activeDialog`; the dialogs below read it back.
 */
export function UserAccountMenu({
  userId,
  userName,
  userPhone,
  isActive,
  isSelf,
}: {
  userId: string
  userName: string
  userPhone: string | null
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
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            <Pencil className="size-4" /> تعديل الاسم والهاتف
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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

      <EditUserDialog
        open={activeDialog === "edit"}
        onOpenChange={(o) => setActiveDialog(o ? "edit" : null)}
        userId={userId}
        name={userName}
        phone={userPhone}
      />

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

function EditUserDialog({
  open,
  onOpenChange,
  userId,
  name,
  phone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  name: string
  phone: string | null
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const formId = `edit-user-form-${userId}`

  function submit(fd: FormData) {
    start(async () => {
      const res = await updateUserAction({
        userId,
        name: String(fd.get("name") ?? ""),
        phone: String(fd.get("phone") ?? ""),
      })
      if (res.status === "ok") {
        toast.success(res.message)
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تعديل بيانات المستخدم"
      description="الاسم ورقم الهاتف فقط — البريد الإلكتروني وكلمة المرور يديرهما المستخدم بنفسه."
      preventClose={pending}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" form={formId} size="sm" loading={pending} loadingText="جارٍ الحفظ…">
            <Save className="size-4" /> حفظ
          </Button>
        </>
      }
    >
      <form id={formId} className="space-y-3" action={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-name">الاسم الكامل</Label>
          <Input id="edit-user-name" name="name" defaultValue={name} required minLength={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-phone">رقم الهاتف (اختياري)</Label>
          <Input id="edit-user-phone" name="phone" defaultValue={phone ?? ""} dir="ltr" />
        </div>
      </form>
    </FormDialog>
  )
}
