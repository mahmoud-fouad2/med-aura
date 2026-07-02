import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarPlus } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { getCaseDetailForUser } from "@/lib/data/cases"
import {
  getLatestConsultation,
  getOutcomePublic,
  isCaseDoctor,
  getTreatmentPlan,
  getQuoteForCase,
  getCareStage,
  getFollowUpTasksForCase,
  getSafetyAlertsForCase,
  getInvoiceForCase,
} from "@/lib/data/care"
import { getCaseClosureEligibility } from "@/lib/actions/case-closure"
import { getCaseConversationView } from "@/lib/data/conversations"
import { getCaseStatusTimeline } from "@/lib/data/concierge"
import { listActivityForEntityIds } from "@/lib/data/admin-activity"
import { listSafetyAssignees } from "@/lib/data/admin-safety"
import { ConversationPanel } from "@/components/care/conversation-panel"
import { CaseTimeline } from "@/components/care/case-timeline"
import { ActivityTimeline } from "@/components/admin/activity-timeline"
import { CreateSafetyAlertForm } from "@/components/admin/create-safety-alert-form"
import { CreateFollowUpTaskForm } from "@/components/admin/create-followup-task-form"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { StageActions } from "@/components/care/stage-actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DocumentUploader } from "@/components/cases/document-uploader"
import { ConsentManager } from "@/components/cases/consent-manager"
import { ConsultationPanel } from "@/components/care/consultation-panel"
import { OutcomeView } from "@/components/care/outcome-view"
import { DoctorCarePanel } from "@/components/care/doctor-care-panel"
import { PatientCarePanel } from "@/components/care/patient-care-panel"
import { FollowUpPanel } from "@/components/care/follow-up-panel"
import { ReportSymptomsForm, SafetyAlertList } from "@/components/care/safety-alert-panel"
import { RemainingBalanceCard, RefundRequestForm, CaseClosureControls } from "@/components/care/finance-actions"
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

  const [
    isDoctorViewer,
    consultation,
    outcome,
    plan,
    quote,
    isCenterViewer,
    careStage,
    followUpTasks,
    safetyAlerts,
    invoice,
    canManageFollowUp,
    canManageSafety,
    canRequestRefund,
    canCloseCase,
    canViewCaseFull,
    canAudit,
    conversation,
    timeline,
  ] = await Promise.all([
    isCaseDoctor(user.id, c.doctorId),
    getLatestConsultation(c.id),
    getOutcomePublic(c.id),
    getTreatmentPlan(c.id),
    getQuoteForCase(c.id),
    hasPermission(user.id, PERMISSIONS.PROCEDURE_CONFIRM),
    getCareStage(c.id),
    getFollowUpTasksForCase(c.id),
    getSafetyAlertsForCase(c.id),
    getInvoiceForCase(c.id),
    hasPermission(user.id, PERMISSIONS.FOLLOWUP_MANAGE),
    hasPermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE),
    hasPermission(user.id, PERMISSIONS.REFUND_REQUEST),
    hasPermission(user.id, PERMISSIONS.CASE_CLOSE),
    hasPermission(user.id, PERMISSIONS.CASE_READ_ANY),
    hasPermission(user.id, PERMISSIONS.AUDIT_READ),
    getCaseConversationView(c.id, user.id),
    getCaseStatusTimeline(c.id),
  ])
  const showDoctorCare =
    isDoctorViewer &&
    ["CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED"].includes(c.status)
  const showPatientCare =
    (c.isOwner || canViewCaseFull) && (plan?.status === "PUBLISHED" || Boolean(quote))
  const completedStates = ["PROCEDURE_COMPLETED", "FOLLOW_UP", "FULLY_PAID", "CLOSED"]
  const showStage =
    (isDoctorViewer && c.status === "DEPOSIT_PAID") ||
    (isCenterViewer && ["MEDICALLY_APPROVED", "PROCEDURE_CONFIRMED"].includes(c.status)) ||
    (c.isOwner &&
      (c.status === "CENTER_CONFIRMED" ||
        (completedStates.includes(c.status) && !careStage.hasReview)))
  const closureEligibility =
    canCloseCase && (completedStates.includes(c.status) || c.status === "CLOSED")
      ? await getCaseClosureEligibility(c.id)
      : null

  const activity = canAudit
    ? await listActivityForEntityIds(
        [c.id, plan?.id, quote?.id, invoice?.id, ...safetyAlerts.map((a) => a.id), ...followUpTasks.map((t) => t.id)].filter(
          (id): id is string => Boolean(id),
        ),
      )
    : []
  const safetyAssignees = canManageSafety ? await listSafetyAssignees() : []

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
          <p className="mt-1 text-sm text-muted-foreground">
            {c.reference}
            {!c.isOwner && (canViewCaseFull || isDoctorViewer || isCenterViewer) && (
              <>
                {" · "}
                {c.patientName}
                {c.centerName && ` · ${c.centerName}`}
                {c.doctorName && ` · ${c.doctorName}`}
              </>
            )}
          </p>
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

      {showDoctorCare && (
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
            الخطة العلاجية وعرض السعر
          </h2>
          <DoctorCarePanel
            caseId={c.id}
            caseStatus={c.status}
            plan={plan}
            quote={quote}
          />
        </Card>
      )}

      {showPatientCare && (
        <Card className="p-6">
          <PatientCarePanel plan={plan} quote={quote} readOnly={!c.isOwner} />
        </Card>
      )}

      {showStage && (
        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold text-foreground">
            الإجراء التالي
          </h2>
          {isDoctorViewer && (
            <StageActions caseId={c.id} caseStatus={c.status} role="doctor" stage={careStage} />
          )}
          {isCenterViewer && (
            <StageActions caseId={c.id} caseStatus={c.status} role="center" stage={careStage} />
          )}
          {c.isOwner && (
            <StageActions caseId={c.id} caseStatus={c.status} role="patient" stage={careStage} />
          )}
        </Card>
      )}

      {(followUpTasks.length > 0 || (c.isOwner && completedStates.includes(c.status)) || canManageFollowUp) && (
        <Card className="space-y-4 p-6">
          <FollowUpPanel
            caseId={c.id}
            tasks={followUpTasks}
            canSubmit={c.isOwner}
            canReview={isDoctorViewer && canManageFollowUp}
          />
          {canManageFollowUp && (
            <div className="border-t border-border pt-4">
              <CreateFollowUpTaskForm caseId={c.id} />
            </div>
          )}
          {c.isOwner && (
            <div className="border-t border-border pt-4">
              <ReportSymptomsForm caseId={c.id} />
            </div>
          )}
        </Card>
      )}

      {canManageSafety && (
        <Card className="space-y-4 p-6">
          {safetyAlerts.length > 0 && <SafetyAlertList alerts={safetyAlerts} />}
          <CreateSafetyAlertForm caseId={c.id} assignees={safetyAssignees} />
        </Card>
      )}

      {invoice && (c.isOwner || canViewCaseFull) && (
        <Card className="space-y-4 p-6">
          <RemainingBalanceCard caseId={c.id} invoice={invoice} readOnly={!c.isOwner} />
          {canRequestRefund && Number(invoice.paidAmount) > 0 && (
            <RefundRequestForm caseId={c.id} />
          )}
        </Card>
      )}

      {closureEligibility && (
        <Card className="space-y-3 p-6">
          <h2 className="font-heading text-lg font-bold text-foreground">إغلاق الحالة</h2>
          <CaseClosureControls
            caseId={c.id}
            eligibility={closureEligibility}
            isClosed={c.status === "CLOSED"}
          />
        </Card>
      )}

      {timeline.length > 0 && (
        <Card className="p-6">
          <CaseTimeline entries={timeline} />
        </Card>
      )}

      {canAudit && activity.length > 0 && (
        <Card className="p-6">
          <ActivityTimeline entries={activity} />
        </Card>
      )}

      <Card className="p-6">
        <ConversationPanel
          caseId={c.id}
          conversation={conversation}
          currentUserId={user.id}
          canWriteInternalNote={!c.isOwner}
        />
      </Card>

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
