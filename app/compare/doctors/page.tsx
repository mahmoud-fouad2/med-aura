import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, XCircle, ArrowLeft, Users, Award } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getDoctorsForCompare } from "@/lib/data/compare"
import { countryNameAr } from "@/lib/status-labels"
import { formatMoney } from "@/lib/money"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "مقارنة أطباء",
  description: "قارن حتى 4 أطباء تجميل معتمدين جنبًا إلى جنب.",
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

export default async function DoctorComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const ids = parseIds(sp.ids)
  const rows = await getDoctorsForCompare(ids)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                مقارنة نخبة أطباء التجميل
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                مقارنة دقيقة ومباشرة بين الأطباء المعتمدين لمساعدتكِ على اختيار الطبيب الأنسب لاحتياجكِ بكل ثقة.
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" render={<Link href="/search">
              <ArrowLeft className="size-4" />
              العودة للبحث
            </Link>} />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا توجد نتائج للمقارنة"
              description="أضيفي أطباء إلى المقارنة من صفحة البحث أو بطاقات الأطباء."
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
                {rows.map((d) => (
                  <Card key={d.id} className="rounded-2xl border border-border/80 bg-card p-5 text-center shadow-sm">
                    {d.photoUrl ? (
                      <Image
                        src={d.photoUrl}
                        alt={d.name}
                        width={96}
                        height={96}
                        className="mx-auto size-24 rounded-2xl object-cover ring-1 ring-border/80 shadow-sm"
                      />
                    ) : (
                      <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Users className="size-9" />
                      </div>
                    )}
                    <h3 className="mt-3 font-heading font-bold text-foreground">
                      {d.name}
                    </h3>
                    {d.title && (
                      <p className="text-xs text-muted-foreground">{d.title}</p>
                    )}
                    <Button
                      className="mt-3 w-full rounded-xl shadow-sm"
                      size="sm"
                      render={<Link href={`/doctors/${d.slug}`}>عرض الملف</Link>}
                    />
                  </Card>
                ))}

                <Row label="الدولة">
                  {rows.map((d) => (
                    <Cell key={d.id}>{countryNameAr(d.country)}</Cell>
                  ))}
                </Row>
                <Row label="المدينة">
                  {rows.map((d) => (
                    <Cell key={d.id}>{d.city ?? "—"}</Cell>
                  ))}
                </Row>
                <Row label="سنوات الخبرة">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      {d.yearsExperience.toLocaleString("ar-SA-u-nu-latn")}
                    </Cell>
                  ))}
                </Row>
                <Row label="اللغات">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      {d.languages?.length
                        ? d.languages.join("، ")
                        : "—"}
                    </Cell>
                  ))}
                </Row>
                <Row label="رسوم الاستشارة">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      {d.consultationFee
                        ? formatMoney(d.consultationFee, d.currency, "ar")
                        : "—"}
                    </Cell>
                  ))}
                </Row>
                <Row label="استشارة فيديو">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      <BoolIcon on={d.offersVideo} />
                    </Cell>
                  ))}
                </Row>
                <Row label="استشارة حضورية">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      <BoolIcon on={d.offersInPerson} />
                    </Cell>
                  ))}
                </Row>
                <Row label="التقييم">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      {d.reviewCount > 0 && d.rating
                        ? `${d.rating} (${d.reviewCount.toLocaleString("ar-SA-u-nu-latn")})`
                        : "لا توجد تقييمات موثّقة بعد"}
                    </Cell>
                  ))}
                </Row>
                <Row label="نبذة">
                  {rows.map((d) => (
                    <Cell key={d.id}>
                      <span className="line-clamp-3 text-xs">
                        {d.bio ?? "—"}
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
      <div className="flex items-center rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs font-bold text-foreground border border-border/60">
        <Award className="me-1.5 size-3.5 text-primary" />
        {label}
      </div>
      {children}
    </>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm">
      {children}
    </div>
  )
}

function BoolIcon({ on }: { on: boolean }) {
  return on ? (
    <CheckCircle2 className="size-4 text-success" />
  ) : (
    <XCircle className="size-4 text-muted-foreground" />
  )
}
