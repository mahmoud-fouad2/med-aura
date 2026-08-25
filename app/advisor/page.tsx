import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AdvisorQuiz } from "@/components/advisor/advisor-quiz"

export const metadata = {
  title: "المستشار التجميلي الذكي | مد أورا",
  description: "أجيبي عن أسئلة بسيطة وسنرشّح لكِ الإجراء والأطباء الأنسب لحالتكِ.",
}

export default function AdvisorPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20 flex flex-col">
        <AdvisorQuiz />
      </main>
      <SiteFooter />
    </div>
  )
}
