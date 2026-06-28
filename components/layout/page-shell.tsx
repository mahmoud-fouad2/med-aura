import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

/** Shell for public content pages: header + centered content + footer. */
export function PageShell({
  title,
  intro,
  children,
}: {
  title?: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          {title && (
            <header className="mb-8">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              {intro && (
                <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                  {intro}
                </p>
              )}
            </header>
          )}
          <div className="space-y-6 text-[15px] leading-loose text-foreground/90">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
