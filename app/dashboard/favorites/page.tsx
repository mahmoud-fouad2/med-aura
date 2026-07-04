import Link from "next/link"
import { HeartOff, MapPin, Stethoscope, Building2, Sparkles } from "lucide-react"
import { requireAuthPage } from "@/lib/session"
import { listFavoritesForUser } from "@/lib/data/favorites"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { FavoriteToggle } from "@/components/favorites/favorite-toggle"
import { Button } from "@/components/ui/button"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "المفضلة" }

export default async function FavoritesPage() {
  const user = await requireAuthPage("/dashboard/favorites")
  const favs = await listFavoritesForUser(user.id)

  const empty =
    favs.doctors.length === 0 &&
    favs.centers.length === 0 &&
    favs.procedures.length === 0

  const compareDoctorIds = favs.doctors.slice(0, 4).map((d) => d.id).join(",")
  const compareCenterIds = favs.centers.slice(0, 4).map((c) => c.id).join(",")

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            المفضلة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            المحتوى الذي حفظته للرجوع إليه لاحقًا. تظهر لك فقط، ولا تُشارك مع
            الأطباء أو المراكز.
          </p>
        </div>
      </div>

      {empty ? (
        <EmptyState
          icon={HeartOff}
          title="لا توجد عناصر في المفضلة"
          description="اضغط على أيقونة القلب في بطاقات الأطباء والمراكز والإجراءات لحفظها هنا."
          action={<Button render={<Link href="/search">اكتشف الأطباء</Link>} />}
        />
      ) : (
        <>
          {favs.doctors.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                  <Stethoscope className="size-5 text-primary" /> الأطباء
                  <span className="text-xs font-normal text-muted-foreground">
                    ({favs.doctors.length})
                  </span>
                </h2>
                {favs.doctors.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link
                        href={`/compare/doctors?ids=${encodeURIComponent(compareDoctorIds)}`}
                      >
                        قارن {Math.min(favs.doctors.length, 4)} أطباء
                      </Link>
                    }
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favs.doctors.map((d) => (
                  <Card key={d.id} className="relative p-5">
                    <div className="absolute end-3 top-3">
                      <FavoriteToggle
                        kind="doctor"
                        refId={d.id}
                        initialFavorited
                        isSignedIn
                        size={32}
                      />
                    </div>
                    <Link href={`/doctors/${d.slug}`} className="block">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Stethoscope className="size-6" />
                      </div>
                      <h3 className="mt-3 font-heading font-bold text-foreground">
                        {d.name}
                      </h3>
                      {d.title && (
                        <p className="text-xs text-muted-foreground">
                          {d.title}
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {[d.city, countryNameAr(d.country)]
                          .filter(Boolean)
                          .join("، ")}
                      </p>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {favs.centers.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                  <Building2 className="size-5 text-primary" /> المراكز
                  <span className="text-xs font-normal text-muted-foreground">
                    ({favs.centers.length})
                  </span>
                </h2>
                {favs.centers.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link
                        href={`/compare/centers?ids=${encodeURIComponent(compareCenterIds)}`}
                      >
                        قارن {Math.min(favs.centers.length, 4)} مراكز
                      </Link>
                    }
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favs.centers.map((c) => (
                  <Card key={c.id} className="relative p-5">
                    <div className="absolute end-3 top-3">
                      <FavoriteToggle
                        kind="center"
                        refId={c.id}
                        initialFavorited
                        isSignedIn
                        size={32}
                      />
                    </div>
                    <Link href={`/centers/${c.slug}`} className="block">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="size-6" />
                      </div>
                      <h3 className="mt-3 font-heading font-bold text-foreground">
                        {c.name}
                      </h3>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {[c.city, countryNameAr(c.country)]
                          .filter(Boolean)
                          .join("، ")}
                      </p>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {favs.procedures.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <Sparkles className="size-5 text-primary" /> الإجراءات
                <span className="text-xs font-normal text-muted-foreground">
                  ({favs.procedures.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favs.procedures.map((p) => (
                  <Card key={p.id} className="relative p-5">
                    <div className="absolute end-3 top-3">
                      <FavoriteToggle
                        kind="procedure"
                        refId={p.id}
                        initialFavorited
                        isSignedIn
                        size={32}
                      />
                    </div>
                    <Link href={`/procedures/${p.slug}`} className="block">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="size-6" />
                      </div>
                      <p className="mt-3 text-xs font-medium text-primary">
                        {p.categoryNameAr}
                      </p>
                      <h3 className="font-heading font-bold text-foreground">
                        {p.nameAr}
                      </h3>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
