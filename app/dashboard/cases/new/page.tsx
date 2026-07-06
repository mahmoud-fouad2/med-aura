import { and, asc, eq, inArray } from "drizzle-orm"
import { Sparkles, ShieldCheck, FileLock2, Info } from "lucide-react"
import { db } from "@/lib/db"
import {
  procedure as procedureT,
  doctorProfile,
  doctorProcedure,
} from "@/lib/db/schema"
import { CaseWizard, type WizardDoctor } from "@/components/cases/case-wizard"
import { PageHeader } from "@/components/dashboard/page-header"

export const dynamic = "force-dynamic"

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ doctor?: string; procedure?: string }>
}) {
  const { doctor: doctorId, procedure: defaultProcedure } = await searchParams

  let doctorName: string | null = null
  let procedures: { slug: string; nameAr: string }[]
  let doctors: WizardDoctor[] = []

  if (doctorId) {
    const doc = (
      await db
        .select({ name: doctorProfile.name })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, doctorId))
        .limit(1)
    )[0]
    doctorName = doc?.name ?? null

    procedures = await db
      .select({ slug: procedureT.slug, nameAr: procedureT.nameAr })
      .from(doctorProcedure)
      .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
      .where(eq(doctorProcedure.doctorId, doctorId))
      .orderBy(asc(procedureT.nameAr))
  } else {
    // No doctor preselected: the wizard shows a required picker so the case
    // always has a receiving doctor. Fetch approved+published doctors with
    // the slugs of the procedures each one offers (batched, no N+1).
    const [procs, docRows] = await Promise.all([
      db
        .select({ slug: procedureT.slug, nameAr: procedureT.nameAr })
        .from(procedureT)
        .where(eq(procedureT.visible, true))
        .orderBy(asc(procedureT.sortOrder)),
      db
        .select({
          id: doctorProfile.id,
          name: doctorProfile.name,
          city: doctorProfile.city,
        })
        .from(doctorProfile)
        .where(
          and(
            eq(doctorProfile.status, "approved"),
            eq(doctorProfile.published, true),
          ),
        )
        .orderBy(asc(doctorProfile.name))
        .limit(200),
    ])
    procedures = procs

    if (docRows.length > 0) {
      const links = await db
        .select({
          doctorId: doctorProcedure.doctorId,
          slug: procedureT.slug,
        })
        .from(doctorProcedure)
        .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
        .where(inArray(doctorProcedure.doctorId, docRows.map((d) => d.id)))
      const slugsByDoctor = new Map<string, string[]>()
      for (const l of links) {
        const list = slugsByDoctor.get(l.doctorId) ?? []
        list.push(l.slug)
        slugsByDoctor.set(l.doctorId, list)
      }
      doctors = docRows.map((d) => ({
        ...d,
        procedureSlugs: slugsByDoctor.get(d.id) ?? [],
      }))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="حالة جديدة"
        title="ابدأ حالتك التجميلية"
        description={
          doctorName
            ? `الحالة ستُفتح مع د. ${doctorName} — أنت تتحكم بمن يراها.`
            : "شارك تفاصيل حالتك بأمان. ملفاتك خاصة ولن يطّلع عليها الطبيب إلا بعد منحك الإذن."
        }
      />

      {/* Privacy assurance strip — three trust points */}
      <div className="grid gap-3 sm:grid-cols-3">
        <TrustCard
          icon={FileLock2}
          title="ملفاتك مشفَّرة"
          desc="نُخزّن الصور والتقارير في مساحة خاصة معزولة."
        />
        <TrustCard
          icon={ShieldCheck}
          title="أنت تتحكم بالإذن"
          desc="لا يراها طبيب إلا بموافقتك المباشرة."
        />
        <TrustCard
          icon={Info}
          title="تراجع في أي وقت"
          desc="يمكنك سحب الإذن أو حذف الحالة لاحقًا."
        />
      </div>

      {doctorName && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              الطبيب المختار: د. {doctorName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ستُشارَك الحالة معه فور إرسالها. يمكنك تغيير الطبيب أو
              مشاركتها لاحقًا مع طبيب آخر.
            </p>
          </div>
        </div>
      )}

      <CaseWizard
        procedures={procedures}
        doctors={doctors}
        defaultProcedure={defaultProcedure}
        doctorId={doctorId}
        doctorName={doctorName}
      />
    </div>
  )
}

function TrustCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  )
}
