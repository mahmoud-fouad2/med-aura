import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarPlus } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { getCaseDetailForUser } from "@/lib/data/cases"
import { getLatestConsultation, getOutcomePublic, isCaseDoctor } from "@/lib/data/care"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DocumentUploader } from "@/components/cases/document-uploader"
import { ConsentManager } from "@/components/cases/consent-manager"
import { ConsultationPanel } from "@/components/care/consultation-panel"
import { OutcomeView } from "@/components/care/outcome-view"
import { caseStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = (await getCurrentUser())!
  const c = await getCaseDetailForUser(user.id, id)
  if (!c) notFound()

  const [isDoctorViewer, consultation, outcome] = await Promise.all([
    isCaseDoctor(user.id, c.doctorId),
    getLatestConsultation(c.id),
    getOutcomePublic(c.id),
  ])

  const answers = c.answers as Record<string, unknown>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {c.procedureName}
            </h1>
            <Badge variant="secondary">{caseStatusAr(c.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{c.reference}</p>
        </div>
        {c.doctorSlug && c.isOwner && (
          <Button
            render={
              <Link href={`/doctors/${c.doctorSlug}/book?case=${c.id}`}>
                <CalendarPlus className="size-4" /> احجز استشارة
              </Link>
            }
          />
        )}
      </div>

      {isDoctorViewer && (
        <Card className="p-6">
          <ConsultationPanel
            caseId={c.id}
            caseStatus={c.status}
            consultation={
              consultation
                ? { id: consultation.id, status: consultation.status }
                : null
            }
            hasOutcome={Boolean(outcome)}
          />
        </Card>
      )}

      {c.isOwner && outcome && (
        <Card className="p-6">
          <OutcomeView outcome={outcome} />
        </Card>
      )}

      <Card className="space-y-3 p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">تفاصيل الحالة</h2>
        {c.goal && <Detail label="الهدف" value={c.goal} />}
        {c.description && <Detail label="الوصف" value={c.description} />}
        {c.ageYears != null && <Detail label="العمر" value={String(c.ageYears)} />}
        {c.doctorName && <Detail label="الطبيب المختار" value={c.doctorName} />}
        {typeof answers.concerns === "string" && answers.concerns && (
          <Detail label="ما يقلقك" value={answers.concerns} />
        )}
        {typeof answers.medications === "string" && answers.medications && (
          <Detail label="الأدوية" value={answers.medications} />
        )}
        {typeof answers.allergies === "string" && answers.allergies && (
          <Detail label="الحساسية" value={answers.allergies} />
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">
          الصور والتقارير
        </h2>
        <DocumentUploader
          caseId={c.id}
          canUpload={c.isOwner}
          initialDocuments={c.documents.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            contentType: d.contentType,
          }))}
        />
      </Card>

      {c.doctorId && c.isOwner && (
        <Card className="space-y-3 p-6">
          <h2 className="font-heading text-lg font-bold text-foreground">
            صلاحية اطّلاع الطبيب
          </h2>
          <ConsentManager
            caseId={c.id}
            doctorName={c.doctorName}
            active={c.consentActive}
          />
        </Card>
      )}

      {!c.doctorId && c.isOwner && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            لم تختر طبيبًا لهذه الحالة بعد.
          </p>
          <Button className="mt-3" render={<Link href="/search">اختر طبيبًا</Link>} />
        </Card>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
