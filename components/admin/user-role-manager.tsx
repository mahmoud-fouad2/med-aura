"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCog, X, ShieldAlert, Check, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toggleUserRoleAction } from "@/lib/actions/users"

type RoleOption = { key: string; nameAr: string }

/**
 * Inline role editor for one user row. Opens a small panel listing every
 * platform role as a toggle chip; granting/revoking calls the server action
 * (ROLE_ASSIGN-guarded) and refreshes the table. Sensitive changes
 * (super_admin) ask for confirmation first.
 */
export function UserRoleManager({
  userId,
  userName,
  currentKeys,
  allRoles,
  selfId,
}: {
  userId: string
  userName: string
  currentKeys: string[]
  allRoles: RoleOption[]
  selfId: string
}) {
  const [open, setOpen] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`إدارة أدوار ${userName}`}
        onClick={() => setOpen(true)}
      >
        <UserCog className="size-4" />
      </Button>
    )
  }

  function toggle(role: RoleOption, has: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      setBusyKey(role.key)
      start(async () => {
        const res = await toggleUserRoleAction({
          userId,
          roleKey: role.key,
          grant: !has,
        })
        setBusyKey(null)
        if (res.status === "ok") {
          toast.success(res.message ?? "تم التحديث")
          router.refresh()
          resolve(true)
        } else {
          toast.error(res.message)
          resolve(false)
        }
      })
    })
  }

  return (
    <Card className="w-72 space-y-3 border-primary/40 p-3 text-start shadow-elegant">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold text-foreground">
          أدوار {userName}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="إغلاق"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allRoles.map((r) => {
          const has = currentKeys.includes(r.key)
          const busy = pending && busyKey === r.key
          const chipClass =
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 " +
            (has
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")
          const chipContent = (
            <>
              {busy ? (
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : has ? (
                <Check className="size-3" />
              ) : (
                <Plus className="size-3" />
              )}
              {r.nameAr}
            </>
          )

          if (r.key === "super_admin") {
            return (
              <ConfirmDialog
                key={r.key}
                trigger={
                  <button type="button" disabled={pending} className={chipClass} aria-pressed={has}>
                    {chipContent}
                  </button>
                }
                title={has ? `إزالة صلاحية مدير النظام؟` : `منح صلاحية مدير النظام؟`}
                description={
                  has
                    ? `ستفقد ${userName} صلاحية الوصول الكامل للمنصة فورًا.`
                    : `سيحصل ${userName} على صلاحية الوصول الكامل لكل أقسام المنصة، بما فيها إدارة الأدوار والبيانات الحساسة.`
                }
                confirmLabel={has ? "إزالة الصلاحية" : "منح الصلاحية"}
                tone="destructive"
                onConfirm={() => toggle(r, has)}
              />
            )
          }

          return (
            <button
              key={r.key}
              type="button"
              disabled={pending}
              onClick={() => toggle(r, has)}
              className={chipClass}
              aria-pressed={has}
            >
              {chipContent}
            </button>
          )
        })}
      </div>
      {currentKeys.includes("super_admin") && userId === selfId && (
        <p className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-warning-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          هذا حسابك — لا يمكنك إزالة صلاحية مدير النظام عن نفسك.
        </p>
      )}
    </Card>
  )
}
