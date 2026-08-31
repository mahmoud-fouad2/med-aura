"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { FormSection } from "@/components/ui/form-section"
import { CountrySelectField } from "@/components/admin/country-select-field"
import { getUserForEditAction, updateUserAction, type UserEditData } from "@/lib/actions/users"

/**
 * Shared "تعديل" tab for the Users and Patients admin drawers — name + phone
 * always; date of birth / nationality / residence / city / emergency contact
 * only for patient accounts (patient_profile has no row for doctors/staff,
 * so there'd be nothing there to show or save).
 */
export function UserEditForm({ userId, isPatient }: { userId: string; isPatient: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<UserEditData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setData(null)
    setError(null)
    getUserForEditAction(userId).then((res) => {
      if (res.status === "error") {
        setError(res.message)
        return
      }
      setData(res.user)
    })
  }, [userId])

  async function onSave() {
    if (!data) return
    setBusy(true)
    setError(null)
    const res = await updateUserAction({
      userId,
      name: data.name,
      phone: data.phone ?? undefined,
      isPatientProfile: isPatient,
      dateOfBirth: data.dateOfBirth ?? undefined,
      nationality: data.nationality ?? undefined,
      residenceCountry: data.residenceCountry ?? undefined,
      city: data.city ?? undefined,
      biologicalSex: data.biologicalSex ?? undefined,
      heightCm: data.heightCm ?? undefined,
      weightKg: data.weightKg ? Number(data.weightKg) : undefined,
      emergencyContactName: data.emergencyContactName ?? undefined,
      emergencyContactPhone: data.emergencyContactPhone ?? undefined,
    })
    setBusy(false)
    if (res.status === "error") {
      setError(res.message)
      return
    }
    toast.success(res.message ?? "تم حفظ التعديلات.")
    router.refresh()
  }

  if (error && !data) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-1">
      <FormSection title="المعلومات الأساسية">
        <Field label="الاسم الكامل">
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </Field>
        <Field label="رقم الهاتف" hint="اختياري">
          <Input dir="ltr" value={data.phone ?? ""} onChange={(e) => setData({ ...data, phone: e.target.value })} />
        </Field>
      </FormSection>

      {isPatient ? (
        <>
          <FormSection title="البيانات الشخصية">
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ الميلاد">
                <Input
                  type="date"
                  dir="ltr"
                  value={data.dateOfBirth ?? ""}
                  onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
                />
              </Field>
              <Field label="الجنسية">
                <CountrySelectField
                  country={data.nationality ?? ""}
                  onChange={(code) => setData({ ...data, nationality: code })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="دولة الإقامة">
                <CountrySelectField
                  country={data.residenceCountry ?? ""}
                  onChange={(code) => setData({ ...data, residenceCountry: code })}
                />
              </Field>
              <Field label="المدينة">
                <Input value={data.city ?? ""} onChange={(e) => setData({ ...data, city: e.target.value })} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="بيانات جسدية أساسية">
            <div className="grid grid-cols-3 gap-3">
              <Field label="الجنس">
                <select
                  value={data.biologicalSex ?? ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      biologicalSex: (e.target.value || null) as "male" | "female" | null,
                    })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">—</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </Field>
              <Field label="الطول (سم)">
                <Input
                  type="number"
                  dir="ltr"
                  value={data.heightCm ?? ""}
                  onChange={(e) =>
                    setData({ ...data, heightCm: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </Field>
              <Field label="الوزن (كجم)">
                <Input
                  type="number"
                  step="0.1"
                  dir="ltr"
                  value={data.weightKg ?? ""}
                  onChange={(e) => setData({ ...data, weightKg: e.target.value || null })}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="جهة اتصال للطوارئ">
            <Field label="الاسم">
              <Input
                value={data.emergencyContactName ?? ""}
                onChange={(e) => setData({ ...data, emergencyContactName: e.target.value })}
              />
            </Field>
            <Field label="رقم الهاتف">
              <Input
                dir="ltr"
                value={data.emergencyContactPhone ?? ""}
                onChange={(e) => setData({ ...data, emergencyContactPhone: e.target.value })}
              />
            </Field>
          </FormSection>
        </>
      ) : null}

      {/* Sticky within the drawer's own scroll container, matching the
          doctor/center edit tabs' save bar. */}
      <div className="sticky bottom-0 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <Button size="sm" loading={busy} loadingText="جارٍ الحفظ…" onClick={onSave}>
          <Save className="size-4" /> حفظ التعديلات
        </Button>
      </div>
    </div>
  )
}
