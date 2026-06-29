import { CalendarDays } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Reveal } from "@/components/motion"

export type LegalBlock = string | { list: string[] }
export type LegalSection = { id: string; title: string; blocks: LegalBlock[] }

export function LegalDoc({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        {/* header band */}
        <div className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {intro}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              آخر تحديث: {updatedAt}
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
          {/* table of contents */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 border-r border-border pr-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                المحتويات
              </p>
              {sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {i + 1}. {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* content */}
          <article className="min-w-0 space-y-10">
            {sections.map((s, i) => (
              <Reveal key={s.id}>
                <section id={s.id} className="scroll-mt-24">
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    <span className="text-primary">{i + 1}.</span> {s.title}
                  </h2>
                  <div className="mt-3 space-y-3 leading-loose text-foreground/85">
                    {s.blocks.map((b, j) =>
                      typeof b === "string" ? (
                        <p key={j}>{b}</p>
                      ) : (
                        <ul key={j} className="space-y-2 pr-5">
                          {b.list.map((item, k) => (
                            <li key={k} className="relative pr-5">
                              <span className="absolute right-0 top-2.5 size-1.5 rounded-full bg-primary" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      ),
                    )}
                  </div>
                </section>
              </Reveal>
            ))}

            <p className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
              هذه الوثيقة جزء من اتفاقية استخدام منصة Med Aura. للاستفسارات
              القانونية أو المتعلقة بالخصوصية، يرجى التواصل عبر صفحة{" "}
              <a href="/contact" className="font-medium text-primary hover:underline">
                تواصل معنا
              </a>
              .
            </p>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
