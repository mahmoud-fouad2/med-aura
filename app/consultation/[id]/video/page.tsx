import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/session"
import { loadVideoContext } from "@/lib/video/service"
import { WebCall } from "@/components/video/web-call"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "استشارة عن بُعد",
  robots: { index: false, follow: false },
}

/**
 * Web entry to a video consultation (doctor's side mainly — patients on the
 * web reach it too). The server decides visibility before a single byte of
 * call UI renders: outsiders get the same 404 a missing appointment gets.
 */
export default async function ConsultationVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/sign-in?next=/consultation/${id}/video`)

  const ctx = await loadVideoContext(id, user)
  if (!ctx.appointment || !ctx.viewerRole) notFound()
  if (ctx.appointment.type !== "VIDEO_CONSULTATION") notFound()

  // The doctor should see the patient's name and vice versa; the shared
  // context exposes the doctor's — the patient perspective needs no name
  // beyond what the dashboard already shows.
  const counterpartName =
    ctx.viewerRole === "patient" ? ctx.appointment.doctorName : "المريض"

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-4xl px-4 py-10 sm:px-6">
      <WebCall
        appointmentId={ctx.appointment.id}
        counterpartName={counterpartName}
        role={ctx.viewerRole}
      />
    </main>
  )
}
