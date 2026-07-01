"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, LayoutGrid, TableIcon, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { createInternalTask, updateInternalTaskStatus, assignInternalTask } from "@/lib/actions/concierge"
import type { InternalTaskRow, AssignableUser } from "@/lib/data/concierge"

const COLUMNS: { key: InternalTaskRow["status"]; label: string }[] = [
  { key: "OPEN", label: "مفتوحة" },
  { key: "IN_PROGRESS", label: "قيد التنفيذ" },
  { key: "DONE", label: "منجزة" },
  { key: "CANCELLED", label: "ملغاة" },
]
const PRIORITY_VARIANT: Record<string, "outline" | "secondary" | "destructive"> = {
  low: "outline", normal: "secondary", high: "destructive", urgent: "destructive",
}
const PRIORITY_LABEL: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" }

function isOverdue(task: InternalTaskRow): boolean {
  return Boolean(task.dueAt) && new Date(task.dueAt!).getTime() < Date.now() && ["OPEN", "IN_PROGRESS"].includes(task.status)
}

export function ConciergeBoard({
  tasks,
  assignableUsers,
}: {
  tasks: InternalTaskRow[]
  assignableUsers: AssignableUser[]
}) {
  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (priorityFilter === "all" || t.priority === priorityFilter) &&
          (assigneeFilter === "all" ||
            (assigneeFilter === "unassigned" ? !t.assignedTo : t.assignedTo === assigneeFilter)),
      ),
    [tasks, priorityFilter, assigneeFilter],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="all">كل الأولويات</option>
            <option value="low">منخفضة</option>
            <option value="normal">عادية</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="all">كل المسؤولين</option>
            <option value="unassigned">غير مُسندة</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>
            <LayoutGrid className="size-4" /> Kanban
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
            <TableIcon className="size-4" /> جدول
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> مهمة جديدة
          </Button>
        </div>
      </div>

      {showForm && <CreateTaskForm assignableUsers={assignableUsers} onDone={() => setShowForm(false)} />}

      {filtered.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="لا توجد مهام" description="أنشئ مهمة جديدة أو غيّر الفلاتر." />
      ) : view === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3 rounded-xl bg-muted/30 p-3">
              <h3 className="font-heading text-sm font-bold text-foreground">
                {col.label} ({filtered.filter((t) => t.status === col.key).length})
              </h3>
              <div className="space-y-2">
                {filtered
                  .filter((t) => t.status === col.key)
                  .map((t) => (
                    <TaskCard key={t.id} task={t} assignableUsers={assignableUsers} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-right">
                <th className="p-3">المهمة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">الأولوية</th>
                <th className="p-3">المسؤول</th>
                <th className="p-3">الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium text-foreground">{t.title}</p>
                    {t.caseId && (
                      <Link href={`/dashboard/cases/${t.caseId}`} className="text-xs text-primary hover:underline">
                        {t.patientName} — {t.procedureName}
                      </Link>
                    )}
                  </td>
                  <td className="p-3">{COLUMNS.find((c) => c.key === t.status)?.label ?? t.status}</td>
                  <td className="p-3">
                    <Badge variant={PRIORITY_VARIANT[t.priority] ?? "outline"}>{PRIORITY_LABEL[t.priority] ?? t.priority}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{t.assigneeName ?? "غير مُسندة"}</td>
                  <td className="p-3">
                    {t.dueAt ? (
                      <span className={isOverdue(t) ? "font-medium text-destructive" : "text-muted-foreground"}>
                        {new Date(t.dueAt).toLocaleDateString("ar-SA")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, assignableUsers }: { task: InternalTaskRow; assignableUsers: AssignableUser[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const overdue = isOverdue(task)

  async function onMove(status: string) {
    setBusy(true)
    await updateInternalTaskStatus({ taskId: task.id, status })
    setBusy(false)
    router.refresh()
  }
  async function onAssign(userId: string) {
    setBusy(true)
    await assignInternalTask({ taskId: task.id, assignedTo: userId || null })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className={`space-y-2 rounded-lg border bg-background p-3 ${overdue ? "border-destructive/50" : "border-border"}`}>
      <p className="text-sm font-medium text-foreground">{task.title}</p>
      {task.caseId && (
        <Link href={`/dashboard/cases/${task.caseId}`} className="block text-xs text-primary hover:underline">
          {task.patientName} — {task.procedureName}
        </Link>
      )}
      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>{PRIORITY_LABEL[task.priority] ?? task.priority}</Badge>
        {task.dueAt && (
          <span className={`inline-flex items-center gap-1 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
            {overdue && <AlertTriangle className="size-3" />}
            {new Date(task.dueAt).toLocaleDateString("ar-SA")}
          </span>
        )}
      </div>
      <select
        disabled={busy}
        value={task.assignedTo ?? ""}
        onChange={(e) => onAssign(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="">غير مُسندة</option>
        {assignableUsers.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <select
        disabled={busy}
        value={task.status}
        onChange={(e) => onMove(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
      >
        {COLUMNS.map((c) => (
          <option key={c.key} value={c.key}>نقل إلى: {c.label}</option>
        ))}
      </select>
    </div>
  )
}

function CreateTaskForm({ assignableUsers, onDone }: { assignableUsers: AssignableUser[]; onDone: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = await createInternalTask({
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      priority: String(fd.get("priority") ?? "normal"),
      dueAt: String(fd.get("dueAt") ?? "") || undefined,
      assignedTo: String(fd.get("assignedTo") ?? "") || undefined,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onDone()
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">العنوان</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dueAt">تاريخ الاستحقاق</Label>
          <Input id="dueAt" name="dueAt" type="date" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">التفاصيل</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="priority">الأولوية</Label>
          <select id="priority" name="priority" defaultValue="normal" className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="low">منخفضة</option>
            <option value="normal">عادية</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignedTo">إسناد إلى</Label>
          <select id="assignedTo" name="assignedTo" className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="">بدون إسناد</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ…" : "إنشاء المهمة"}</Button>
    </form>
  )
}
