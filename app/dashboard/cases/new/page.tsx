import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { procedure as procedureT, doctorProfile, doctorProcedure } from "@/lib/db/schema"
import { CaseWizard } from "@/components/cases/case-wizard"

export const dynamic = "force-dynamic"

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ doctor?: string; procedure?: string }>
}) {
  const { doctor: doctorId, procedure: defaultProcedure } = await searchParams

  let doctorName: string | null = null
  let procedures: { slug: string; nameAr: string }[]

  if (doctorId) {
    const doc = (
      await db
        .select({ name: doctorProfile.name })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, doctorId))
        .limit(1)
    )[0]
    doctorName = doc?.name ?? null

    // restrict to the procedures this doctor offers
    procedures = await db
      .select({ slug: procedureT.slug, nameAr: procedureT.nameAr })
      .from(doctorProcedure)
      .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
      .where(eq(doctorProcedure.doctorId, doctorId))
      .orderBy(asc(procedureT.nameAr))
  } else {
    procedures = await db
      .select({ slug: procedureT.slug, nameAr: procedureT.nameAr })
      .from(procedureT)
      .where(eq(procedureT.visible, true))
      .orderBy(asc(procedureT.sortOrder))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          إنشاء حالة جديدة
        </h1>
        <p className="mt-1 text-muted-foreground">
          شاركنا تفاصيل حالتك بأمان. ملفاتك خاصة ولن يطّلع عليها الطبيب إلا بعد
          منحك الإذن.
        </p>
      </div>
      <CaseWizard
        procedures={procedures}
        defaultProcedure={defaultProcedure}
        doctorId={doctorId}
        doctorName={doctorName}
      />
    </div>
  )
}
