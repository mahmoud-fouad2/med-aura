import Link from "next/link"
import Image from "next/image"
import { CalendarDays, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "المدونة الطبية | مد أورا",
  description: "أحدث المقالات والنصائح الطبية في مجال التجميل والرعاية الصحية.",
}

const STATIC_POSTS = [
  {
    id: "1",
    slug: "rhinoplasty-recovery-tips",
    title: "7 نصائح ذهبية لتسريع التعافي بعد عملية تجميل الأنف",
    excerpt: "تعرفي على أهم الخطوات التي يجب اتباعها بعد جراحة تجميل الأنف لضمان أفضل النتائج وتجنب المضاعفات المحتملة.",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800",
    date: "2026-08-15",
    category: "تجميل الأنف",
  },
  {
    id: "2",
    slug: "hair-transplant-turkey-guide",
    title: "الدليل الشامل لزراعة الشعر في تركيا: التكلفة والتقنيات",
    excerpt: "لماذا تعتبر تركيا الوجهة الأولى لزراعة الشعر؟ دليلك لاختيار المركز المناسب وفهم تقنيات FUE و DHI.",
    image: "https://images.unsplash.com/photo-1582716401301-b2407dc7563d?auto=format&fit=crop&q=80&w=800",
    date: "2026-08-10",
    category: "زراعة الشعر",
  },
  {
    id: "3",
    slug: "fillers-vs-botox",
    title: "الفرق بين الفيلر والبوتكس: متى تختارين أيهما؟",
    excerpt: "مقارنة شاملة بين أشهر حقن التجميل، استخدامات كل منها، ومدى استمراريتها لمساعدتك في اتخاذ القرار الصحيح.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
    date: "2026-08-01",
    category: "الطب التجميلي",
  }
]

export default function BlogIndexPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-5xl">
              المدونة الطبية
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              وجهتكِ الأولى للمعلومات الموثوقة حول الإجراءات التجميلية، الرعاية الصحية، ونصائح الخبراء.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {STATIC_POSTS.map((post) => (
              <Card key={post.id} className="group overflow-hidden rounded-3xl border-border/80 shadow-sm transition-all hover:shadow-md">
                <Link href={`/blog/${post.slug}`}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-foreground backdrop-blur-sm">
                      {post.category}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <CalendarDays className="size-3.5" />
                      <span>{new Date(post.date).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                    <h2 className="font-heading text-xl font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center font-bold text-primary text-sm">
                      اقرأ المزيد
                      <ChevronRight className="size-4 mr-1" />
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
