"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Ticket, Power, PowerOff, Loader2 } from "lucide-react"
import {
  createPromoCodeAction,
  updatePromoCodeAction,
  setPromoCodeActiveAction,
  type PromoCodeRow,
} from "@/lib/actions/promo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { FormDialog } from "@/components/ui/form-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { currencyAr } from "@/lib/status-labels"

type FormState = {
  code: string
  description: string
  discountType: "PERCENTAGE" | "FIXED"
  discountValue: string
  currency: string
  maxRedemptions: string
  maxRedemptionsPerUser: string
  minAmount: string
  validFrom: string
  validUntil: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  currency: "SAR",
  maxRedemptions: "",
  maxRedemptionsPerUser: "1",
  minAmount: "",
  validFrom: "",
  validUntil: "",
  active: true,
}

function toFormState(row: PromoCodeRow): FormState {
  return {
    code: row.code,
    description: row.description ?? "",
    discountType: row.discountType,
    discountValue: row.discountValue,
    currency: row.currency ?? "SAR",
    maxRedemptions: row.maxRedemptions != null ? String(row.maxRedemptions) : "",
    maxRedemptionsPerUser: String(row.maxRedemptionsPerUser),
    minAmount: row.minAmount ?? "",
    validFrom: row.validFrom ? new Date(row.validFrom).toISOString().slice(0, 10) : "",
    validUntil: row.validUntil ? new Date(row.validUntil).toISOString().slice(0, 10) : "",
    active: row.active,
  }
}

function statusFor(row: PromoCodeRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!row.active) return { label: "متوقف", variant: "outline" }
  if (row.validUntil && new Date(row.validUntil) < new Date()) return { label: "منتهي", variant: "destructive" }
  if (row.maxRedemptions != null && row.redemptionCount >= row.maxRedemptions) {
    return { label: "مستنفَد", variant: "secondary" }
  }
  return { label: "نشط", variant: "default" }
}

export function PromoCodesTable({ initialCodes }: { initialCodes: PromoCodeRow[] }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PromoCodeRow | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(row: PromoCodeRow) {
    setEditing(row)
    setForm(toFormState(row))
    setError(null)
    setDialogOpen(true)
  }

  async function save() {
    setBusy(true)
    setError(null)
    const payload = {
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: form.discountValue,
      currency: form.discountType === "FIXED" ? form.currency : undefined,
      maxRedemptions: form.maxRedemptions || undefined,
      maxRedemptionsPerUser: form.maxRedemptionsPerUser || undefined,
      minAmount: form.minAmount || undefined,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
      active: form.active,
    }
    const result = editing
      ? await updatePromoCodeAction({ ...payload, id: editing.id })
      : await createPromoCodeAction(payload)
    setBusy(false)
    if (result.status === "error") {
      setError(result.message)
      return
    }
    toast.success(result.message ?? "تم الحفظ.")
    setDialogOpen(false)
    router.refresh()
  }

  async function toggleActive(row: PromoCodeRow) {
    setPendingToggle(row.id)
    const result = await setPromoCodeActiveAction(row.id, !row.active)
    setPendingToggle(null)
    if (result.status === "error") {
      toast.error(result.message)
      return
    }
    toast.success(result.message ?? "تم التحديث.")
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
        <p className="text-sm text-muted-foreground">
          {initialCodes.length.toLocaleString("ar-SA-u-nu-latn")} كود
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          كود جديد
        </Button>
      </div>

      {initialCodes.length === 0 ? (
        <div className="p-10">
          <EmptyState
            icon={Ticket}
            title="لا توجد أكواد خصم بعد"
            description="أنشئ أول كود لبدء استخدامه في صفحة الحجز."
            tone="muted"
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {initialCodes.map((row) => {
            const status = statusFor(row)
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span dir="ltr" className="font-mono text-sm font-semibold text-foreground">
                      {row.code}
                    </span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.discountType === "PERCENTAGE"
                      ? `خصم ${Number(row.discountValue)}%`
                      : `خصم ${Number(row.discountValue).toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(row.currency ?? "SAR")}`}
                    {" · "}
                    {row.redemptionCount.toLocaleString("ar-SA-u-nu-latn")}
                    {row.maxRedemptions != null ? `/${row.maxRedemptions.toLocaleString("ar-SA-u-nu-latn")}` : ""} استخدام
                    {row.description ? ` · ${row.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="icon-sm" variant="ghost" onClick={() => openEdit(row)} aria-label="تعديل">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={pendingToggle === row.id}
                    onClick={() => void toggleActive(row)}
                    aria-label={row.active ? "إيقاف" : "تفعيل"}
                  >
                    {pendingToggle === row.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : row.active ? (
                      <PowerOff className="size-4" />
                    ) : (
                      <Power className="size-4" />
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `تعديل كود «${editing.code}»` : "كود خصم جديد"}
        maxWidthClassName="max-w-lg"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "حفظ التعديلات" : "إنشاء الكود"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="الكود" hint="حروف إنجليزية وأرقام فقط">
              <Input
                dir="ltr"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10"
              />
            </Field>
            <Field label="نوع الخصم">
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENTAGE" | "FIXED" })}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="PERCENTAGE">نسبة مئوية %</option>
                <option value="FIXED">مبلغ ثابت</option>
              </select>
            </Field>
          </div>

          <Field label="وصف داخلي" hint="اختياري — يظهر للإدارة فقط">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={form.discountType === "PERCENTAGE" ? "النسبة %" : "المبلغ"}>
              <Input
                type="number"
                dir="ltr"
                min={0}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              />
            </Field>
            {form.discountType === "FIXED" && (
              <Field label="العملة">
                <Input
                  dir="ltr"
                  maxLength={3}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الحد الأقصى للاستخدام" hint="اتركه فارغًا لعدم التحديد">
              <Input
                type="number"
                dir="ltr"
                min={1}
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
              />
            </Field>
            <Field label="الحد لكل مستخدم">
              <Input
                type="number"
                dir="ltr"
                min={1}
                value={form.maxRedemptionsPerUser}
                onChange={(e) => setForm({ ...form, maxRedemptionsPerUser: e.target.value })}
              />
            </Field>
          </div>

          <Field label="الحد الأدنى لقيمة الحجز" hint="اختياري">
            <Input
              type="number"
              dir="ltr"
              min={0}
              value={form.minAmount}
              onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="يبدأ من" hint="اختياري">
              <Input
                type="date"
                dir="ltr"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              />
            </Field>
            <Field label="ينتهي في" hint="اختياري">
              <Input
                type="date"
                dir="ltr"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: Boolean(c) })} />
            نشط (متاح للاستخدام فورًا)
          </label>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </FormDialog>
    </>
  )
}
