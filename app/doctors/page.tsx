import SearchPage from "@/app/search/page"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "الأطباء المعتمدون",
  description: "تصفّح أطباء تجميل معتمدين على Med Aura حسب الإجراء والمدينة ونوع الاستشارة.",
  path: "/doctors",
  image: "/hero-medaura-consultation.png",
})
export const dynamic = "force-dynamic"

export default SearchPage
