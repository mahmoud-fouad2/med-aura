import SearchPage from "@/app/search/page"
import { buildPageMetadata } from "@/lib/seo"
import { getI18n } from "@/lib/i18n"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "أطباء التجميل: قارن الخبرات واختر الأنسب" : "Aesthetic doctors: compare experience and find the right fit",
    description: locale === "ar"
      ? "قارن أطباء التجميل حسب مجال الخبرة والإجراء والمدينة ونوع الاستشارة والتقييمات المنشورة، واختر الطبيب الأنسب لاحتياجك."
      : "Compare aesthetic doctors by experience area, procedure, location, consultation type, and published reviews to find the right fit for your needs.",
    path: "/doctors",
    image: "/hero-medaura-consultation.webp",
    locale,
    keywords: locale === "ar"
      ? ["أطباء تجميل", "أفضل طبيب تجميل لاحتياجك", "طبيب تجميل معتمد", "استشارة تجميل أونلاين"]
      : ["aesthetic doctors", "best aesthetic doctor for your needs", "verified cosmetic doctor", "online aesthetic consultation"],
  })
}
export const dynamic = "force-dynamic"

export default SearchPage
