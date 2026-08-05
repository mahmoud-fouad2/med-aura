"use client"

import { useState, useEffect, useTransition } from "react"
import { History, Loader2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, userAccountStatusTone } from "@/components/admin/status-badge"
import { UserRoleManager } from "@/components/admin/user-role-manager"
import { UserAccountMenu } from "@/components/admin/user-account-menu"
import { PatientBillingTab } from "@/components/admin/patient-table"
import { EmptyState } from "@/components/ui/empty-state"
import { getUserActivityAction } from "@/lib/actions/users"
import { actionLabelAr } from "@/lib/audit-labels"
import { roleAr, userAccountStatusAr } from "@/lib/status-labels"
import { dtfMedium } from "@/lib/format"
import type { ActivityRow } from "@/lib/data/admin-activity"

export type AdminUserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  primaryRole: string
  roles: { key: string; nameAr: string }[]
  createdAt: Date
  lastLoginAt: Date | null
}

type RoleOption = { key: string; nameAr: string }

/**
 * Users admin table + row-details drawer (Overview / Roles & Permissions /
 * Security & Access / Activity). The role-manager and account-menu actions
 * already existed as self-contained components — the drawer just gives them
 * a consolidated home instead of a row full of icon buttons, and adds the
 * one thing that didn't exist yet: a per-account activity trail.
 */
export function UserTable({
  rows,
  allRoles,
  canAssign,
  canViewActivity,
  selfId,
}: {
  rows: AdminUserRow[]
  allRoles: RoleOption[]
  canAssign: boolean
  canViewActivity: boolean
  selfId: string
}) {
  const [selected, setSelected] = useState<AdminUserRow | null>(null)

  return (
    <>
      <DataTable
        rows={rows}
        getRowKey={(u) => u.id}
        onRowClick={setSelected}
        columns={[
          {
            header: "المستخدم",
            mobile: "title",
            cell: (u) => (
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-bold text-primary">
                  {u.name.trim().charAt(0) || "؟"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{u.name}</p>
                  <p dir="ltr" className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
            ),
          },
          { header: "الدور الأساسي", cell: (u) => <Badge variant="secondary">{roleAr(u.primaryRole)}</Badge> },
          {
            header: "أدوار إضافية",
            cell: (u) =>
              u.roles.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <div className="flex max-w-56 flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r.key} variant="outline">{roleAr(r.key)}</Badge>
                  ))}
                </div>
              ),
          },
          {
            header: "الحالة",
            mobile: "badge",
            cell: (u) => <StatusBadge tone={userAccountStatusTone(u.status)} label={userAccountStatusAr(u.status)} />,
          },
          {
            header: "آخر دخول",
            cell: (u) =>
              u.lastLoginAt ? (
                new Date(u.lastLoginAt).toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short" })
              ) : (
                <span className="text-muted-foreground/50">لم يسجّل دخول بعد</span>
              ),
          },
        ]}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected ? (
            <UserDetailDrawer
              user={selected}
              allRoles={allRoles}
              canAssign={canAssign}
              canViewActivity={canViewActivity}
              selfId={selfId}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function UserDetailDrawer({
  user,
  allRoles,
  canAssign,
  canViewActivity,
  selfId,
}: {
  user: AdminUserRow
  allRoles: RoleOption[]
  canAssign: boolean
  canViewActivity: boolean
  selfId: string
}) {
  const isPatient = user.primaryRole === "patient" || user.roles.some((r) => r.key === "patient")

  return (
    <>
      <SheetHeader>
        <SheetTitle>{user.name}</SheetTitle>
        <SheetDescription dir="ltr" className="text-start">
          {user.email}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            {isPatient && <TabsTrigger value="billing">الفواتير</TabsTrigger>}
            {canAssign && <TabsTrigger value="roles">الأدوار</TabsTrigger>}
            {canAssign && <TabsTrigger value="security">الأمان</TabsTrigger>}
            {canViewActivity && <TabsTrigger value="activity">النشاط</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DetailGroup>
              <DetailRow label="الحالة" value={<StatusBadge tone={userAccountStatusTone(user.status)} label={userAccountStatusAr(user.status)} />} />
              <DetailRow label="الدور الأساسي" value={roleAr(user.primaryRole)} />
              <DetailRow
                label="الهاتف"
                value={user.phone ? <span dir="ltr">{user.phone}</span> : "—"}
              />
              <DetailRow label="تاريخ التسجيل" value={dtfMedium(user.createdAt)} />
              <DetailRow
                label="آخر دخول"
                value={user.lastLoginAt ? dtfMedium(user.lastLoginAt) : "لم يسجّل دخول بعد"}
              />
            </DetailGroup>
            {user.roles.length > 0 && (
              <DetailGroup title="كل الأدوار الممنوحة">
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((r) => (
                    <Badge key={r.key} variant="outline">{roleAr(r.key)}</Badge>
                  ))}
                </div>
              </DetailGroup>
            )}
          </TabsContent>

          {isPatient && (
            <TabsContent value="billing">
              <PatientBillingTab userId={user.id} />
            </TabsContent>
          )}

          {canAssign && (
            <TabsContent value="roles" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                امنح أو أزل أدوارًا لهذا المستخدم — كل تغيير يُسجَّل في سجل النشاط.
              </p>
              <UserRoleManager
                userId={user.id}
                userName={user.name}
                currentKeys={user.roles.map((r) => r.key)}
                allRoles={allRoles.map((r) => ({ key: r.key, nameAr: roleAr(r.key) }))}
                selfId={selfId}
              />
            </TabsContent>
          )}

          {canAssign && (
            <TabsContent value="security" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                تعديل البيانات، تعطيل/تفعيل الحساب، تسجيل الخروج من كل الأجهزة، أو إرسال رابط
                إعادة تعيين كلمة المرور.
              </p>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium text-foreground">إجراءات الحساب</span>
                <UserAccountMenu
                  userId={user.id}
                  userName={user.name}
                  userPhone={user.phone}
                  isActive={user.status === "active"}
                  isSelf={user.id === selfId}
                />
              </div>
            </TabsContent>
          )}

          {canViewActivity && (
            <TabsContent value="activity">
              <UserActivityTab userId={user.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  )
}

function UserActivityTab({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setEntries(null)
    setError(null)
    start(async () => {
      const res = await getUserActivityAction(userId)
      if (res.status === "ok") setEntries(res.entries)
      else setError(res.message)
    })
  }, [userId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (entries === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={History} title="لا يوجد نشاط مسجَّل" description="لم تُسجَّل أي تغييرات على هذا الحساب بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{actionLabelAr(e.action)}</p>
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {dtfMedium(e.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">بواسطة {e.actorName ?? "النظام"}</p>
        </li>
      ))}
    </ul>
  )
}

function DetailGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {title ? <p className="text-xs font-medium text-muted-foreground">{title}</p> : null}
      <div className="space-y-1.5 rounded-lg border border-border/60 p-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
