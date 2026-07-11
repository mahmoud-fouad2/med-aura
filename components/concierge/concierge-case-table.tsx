"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { MobileDataCard } from "@/components/ui/mobile-data-card"
import { caseStatusAr } from "@/lib/status-labels"
import type { ConciergeCaseRow } from "@/lib/data/concierge"

export function ConciergeCaseTable({ cases }: { cases: ConciergeCaseRow[] }) {
  const [q, setQ] = useState("")
  const filtered = cases.filter((c) => {
    const digits = q.replace(/[^\d+]/g, "")
    if (digits.length >= 3 && c.patientPhone?.replace(/[^\d+]/g, "").includes(digits)) return true
    const haystack = `${c.patientName} ${c.procedureName} ${c.doctorName ?? ""} ${c.centerName ?? ""} ${c.reference}`
    return haystack.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالمريض أو رقم الهاتف أو الإجراء أو الطبيب…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="لا توجد نتائج" description="جرّب كلمة بحث مختلفة." />
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {filtered.map((c) => (
              <MobileDataCard
                key={c.id}
                title={
                  <Link href={`/dashboard/cases/${c.id}`} className="text-primary hover:underline">
                    {c.patientName}
                  </Link>
                }
                subtitle={c.procedureName}
                badge={<Badge variant="secondary">{caseStatusAr(c.status)}</Badge>}
                rows={[
                  {
                    label: "الهاتف",
                    value: c.patientPhone ? (
                      <a href={`tel:${c.patientPhone}`} dir="ltr" className="inline-flex items-center gap-1 text-primary">
                        <Phone className="size-3" />
                        {c.patientPhone}
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "الطبيب", value: c.doctorName ?? "—" },
                  { label: "المركز", value: c.centerName ?? "—" },
                  {
                    label: "آخر تحديث",
                    value: new Date(c.updatedAt).toLocaleDateString("ar-SA-u-nu-latn"),
                  },
                ]}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-right">
                <th className="p-3">المريض</th>
                <th className="p-3">الهاتف</th>
                <th className="p-3">الإجراء</th>
                <th className="p-3">الطبيب</th>
                <th className="p-3">المركز</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/dashboard/cases/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.patientName}
                    </Link>
                  </td>
                  <td className="p-3">
                    {c.patientPhone ? (
                      <a
                        href={`tel:${c.patientPhone}`}
                        dir="ltr"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        <Phone className="size-3" />
                        {c.patientPhone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="p-3">{c.procedureName}</td>
                  <td className="p-3 text-muted-foreground">{c.doctorName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.centerName ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{caseStatusAr(c.status)}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString("ar-SA-u-nu-latn")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}
