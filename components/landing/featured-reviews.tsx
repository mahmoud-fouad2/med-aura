import Link from "next/link"
import { ArrowLeft, BadgeCheck, Quote, Star } from "lucide-react"
import { Stagger, StaggerItem } from "@/components/motion"
import { PersonAvatar } from "@/components/ui/person-avatar"
import { SectionHeading } from "@/components/ui/section-heading"
import { query } from "@/lib/db/query"
import { getFeaturedReviewSummary, type FeaturedReview } from "@/lib/data/reviews"
import { getI18n } from "@/lib/i18n"
import { localizedPath, type Locale } from "@/lib/i18n/config"

function abbreviatedName(name: string, anonymous: boolean, locale: Locale) {
  if (anonymous || !name.trim()) {
    return locale === "ar" ? "مريض موثّق" : "Verified patient"
  }

  const parts = name.trim().split(/\s+/)
  const familyInitial = parts.length > 1 ? `${parts.at(-1)?.charAt(0)}.` : ""
  return [parts[0], familyInitial].filter(Boolean).join(" ")
}

function ReviewStars({ rating, locale }: { rating: number; locale: Locale }) {
  const label = locale === "ar" ? `التقييم ${rating} من 5` : `Rated ${rating} out of 5`

  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={
            index < rating
              ? "fill-gold text-gold size-4 sm:size-[18px]"
              : "fill-muted text-muted-foreground/25 size-4 sm:size-[18px]"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function ReviewCard({ review, locale }: { review: FeaturedReview; locale: Locale }) {
  const isAr = locale === "ar"
  const author = abbreviatedName(review.authorName, review.anonymous, locale)
  const procedureName = isAr ? review.procedureNameAr : review.procedureNameEn
  const meta = [procedureName, review.city].filter(Boolean).join(" · ")

  return (
    <figure className="border-border/80 bg-card/90 hover:border-primary/40 hover:shadow-elegant relative flex h-full min-h-[292px] snap-center flex-col overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 sm:min-h-[310px] sm:p-7">
      <Quote
        className="fill-gold/10 text-gold/10 pointer-events-none absolute end-5 top-16 size-16"
        aria-hidden="true"
      />

      <ReviewStars rating={review.rating} locale={locale} />
      <blockquote className="text-foreground relative mt-7 line-clamp-5 flex-1 text-base leading-8 font-medium text-pretty sm:text-lg">
        “{review.comment}”
      </blockquote>

      <figcaption className="border-border/70 mt-6 flex items-center gap-3 border-t pt-4">
        <PersonAvatar
          src={review.authorImage}
          name={author}
          size="lg"
          className="ring-background size-12 ring-2"
        />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-foreground truncate text-sm font-bold sm:text-base">
            {author}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs sm:text-sm">
            {meta || (isAr ? "استشارة عبر Med Aura" : "Med Aura consultation")}
          </p>
          <span className="text-primary mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">
            <BadgeCheck className="fill-primary/10 size-4" aria-hidden="true" />
            {isAr ? "تجربة موثّقة" : "Verified experience"}
          </span>
        </div>
      </figcaption>
    </figure>
  )
}

export async function FeaturedReviews() {
  const [res, { locale }] = await Promise.all([query(() => getFeaturedReviewSummary(3)), getI18n()])

  if (res.status !== "ok" || res.data.reviews.length === 0) return null

  const isAr = locale === "ar"
  const { reviews, averageRating, reviewCount } = res.data
  const rating = averageRating.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const count = reviewCount.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US")

  return (
    <section className="border-border border-b bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            align="start"
            eyebrow={isAr ? "آراء وتجارب المراجعين" : "Verified experiences"}
            title={isAr ? "قصص نجاح وتجارب تجميلية ملهمة" : "Real experiences. Greater confidence."}
            subtitle={
              isAr
                ? "تجارب حقيقية وتقييمات صادقة من مراجعين أتمّوا استشاراتهم ورحلتهم التجميلية مع نخبة أطباء Med Aura."
                : "Reviews from patients who completed consultations through Med Aura."
            }
          />

          <div className="flex shrink-0 items-center gap-4 lg:pb-1" dir="ltr">
            <strong className="font-numbers text-foreground text-5xl leading-none font-semibold">
              {rating}
            </strong>
            <div>
              <ReviewStars rating={Math.round(averageRating)} locale={locale} />
              <p className="text-muted-foreground mt-1.5 text-xs">
                {isAr ? `${count} تقييم موثّق` : `${count} verified reviews`}
              </p>
            </div>
          </div>
        </div>

        <Stagger className="mt-9 grid snap-x snap-mandatory auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[48%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {reviews.map((review) => (
            <StaggerItem key={review.id} className="h-full">
              <ReviewCard review={review} locale={locale} />
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-5 flex justify-end">
          <Link
            href={localizedPath("/review-policy", locale)}
            className="group text-primary hover:text-primary/75 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold transition-colors"
          >
            {isAr ? "كيف نوثّق التقييمات" : "How reviews are verified"}
            <ArrowLeft className="size-4 transition-transform duration-300 ltr:rotate-180 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
