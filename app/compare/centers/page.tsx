import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ArrowLeft, Building2, Award } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getCentersForCompare } from "@/lib/data/compare"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "مقارنة مراكز",
  description: "قارن حتى 4 مراكز تجميل معتمدة جنبًا إلى جنب.",
}

function parseIds(v: string | string[] | undefined): string[] {
  const raw = Array.isArray(v) ? v[0] : v
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
}

export default async function CenterComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const ids = parseIds(sp.ids)
  const rows = await getCentersForCompare(ids)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                مقارنة المراكز
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                عرض جنبًا إلى جنب للمراكز المعتمدة والمنشورة فقط.
              </p>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/centers">
              <ArrowLeft className="size-4" />
              العودة للمراكز
            </Link>} />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="لا توجد نتائج للمقارنة"
              description="أضف مراكز إلى المفضلة أولاً لتظهر هنا."
            />
          ) : (
            <div className="overflow-x-auto">
              <div
                className="min-w-full grid gap-4"
                style={{
                  gridTemplateColumns: `220px repeat(${rows.length}, minmax(220px, 1fr))`,
                }}
              >
                <div />
                {rows.map((c) => (
                  <Card key={c.id} className="p-4 text-center">
                    {c.logoUrl ? (
                      <Image
                        src={c.logoUrl}
                        alt={c.name}
                        width={96}
                        height={96}
                        className="mx-auto size-24 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Building2 className="size-9" />
                      </div>
                    )}
                    <h3 className="mt-3 font-heading font-bold text-foreground">
                      {c.name}
                    </h3>
                    {c.verified && (
                      <p className="text-[11px] text-success">مركز موثّق</p>
                    )}
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      render={<Link href={`/centers/${c.slug}`}>عرض المركز</Link>}
                    />
                  </Card>
                ))}

                <Row label="الدولة">
                  {rows.map((c) => (
                    <Cell key={c.id}>{countryNameAr(c.country)}</Cell>
                  ))}
                </Row>
                <Row label="المدينة">
                  {rows.map((c) => (
                    <Cell key={c.id}>{c.city ?? "—"}</Cell>
                  ))}
                </Row>
                <Row label="اللغات">
                  {rows.map((c) => (
                    <Cell key={c.id}>
                      {c.languages?.length
                        ? c.languages.join("، ")
                        : "—"}
                    </Cell>
                  ))}
                </Row>
                <Row label="التقييم">
                  {rows.map((c) => (
                    <Cell key={c.id}>
                      {c.reviewCount > 0 && c.rating
                        ? `${c.rating} (${c.reviewCount.toLocaleString("ar-SA-u-nu-latn")})`
                        : "لا توجد تقييمات موثّقة بعد"}
                    </Cell>
                  ))}
                </Row>
                <Row label="التوثيق">
                  {rows.map((c) => (
                    <Cell key={c.id}>
                      {c.verified ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : (
                        "غير موثّق"
                      )}
                    </Cell>
                  ))}
                </Row>
                <Row label="عن المركز">
                  {rows.map((c) => (
                    <Cell key={c.id}>
                      <span className="line-clamp-3 text-xs">
                        {c.description ?? "—"}
                      </span>
                    </Cell>
                  ))}
                </Row>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <div className="flex items-center rounded-lg bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <Award className="me-1.5 size-3.5 text-primary" />
        {label}
      </div>
      {children}
    </>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
      {children}
    </div>
  )
}
