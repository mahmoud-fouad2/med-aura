import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { listCasesForPatient } from "@/lib/data/cases"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { caseStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export default async function CasesPage() {
  const user = (await getCurrentUser())!
  const cases = await listCasesForPatient(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">حالاتي</h1>
        <Button render={<Link href="/search"><Plus className="size-4" /> حالة جديدة</Link>} />
      </div>

      {cases.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            لم تنشئ أي حالة بعد. ابدأ باختيار طبيب ثم أنشئ حالتك.
          </p>
          <Button render={<Link href="/search">ابحث عن طبيب</Link>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/dashboard/cases/${c.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-foreground">
                      {c.procedureName}
                    </span>
                    <Badge variant="secondary">{caseStatusAr(c.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.reference}
                    {c.doctorName ? ` · ${c.doctorName}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
