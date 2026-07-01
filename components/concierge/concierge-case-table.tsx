"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { caseStatusAr } from "@/lib/status-labels"
import type { ConciergeCaseRow } from "@/lib/data/concierge"

export function ConciergeCaseTable({ cases }: { cases: ConciergeCaseRow[] }) {
  const [q, setQ] = useState("")
  const filtered = cases.filter((c) => {
    const haystack = `${c.patientName} ${c.procedureName} ${c.doctorName ?? ""} ${c.centerName ?? ""} ${c.reference}`
    return haystack.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالمريض أو الإجراء أو الطبيب أو المركز…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="لا توجد نتائج" description="جرّب كلمة بحث مختلفة." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-right">
                <th className="p-3">المريض</th>
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
                  <td className="p-3">{c.procedureName}</td>
                  <td className="p-3 text-muted-foreground">{c.doctorName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.centerName ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{caseStatusAr(c.status)}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString("ar-SA")}
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
