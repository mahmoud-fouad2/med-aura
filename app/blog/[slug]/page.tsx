import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, ChevronRight, User, Share2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Button } from "@/components/ui/button"

export const dynamic = "force-static"

const STATIC_POSTS = {
  "rhinoplasty-recovery-tips": {
    title: "7 نصائح ذهبية لتسريع التعافي بعد عملية تجميل الأنف",
    content: "عملية تجميل الأنف هي خطوة كبيرة نحو تعزيز ثقتك بنفسك. لضمان أفضل النتائج، فترة التعافي هي الأهم. إليك أبرز النصائح: \n\n1. التزمي بالراحة التامة وتجنبي المجهود البدني.\n2. ارفعي رأسك عند النوم لتقليل التورم.\n3. استخدمي الكمادات الباردة حسب إرشادات الطبيب.\n4. تجنبي الأطعمة التي تحتاج لمضغ قوي في الأيام الأولى.",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-15",
    category: "تجميل الأنف",
    author: "د. أحمد عبدالله",
  },
  "hair-transplant-turkey-guide": {
    title: "الدليل الشامل لزراعة الشعر في تركيا: التكلفة والتقنيات",
    content: "تعتبر تركيا عاصمة زراعة الشعر عالمياً بفضل الأطباء المتميزين والأسعار التنافسية. من أشهر التقنيات المستخدمة: \n\n- تقنية FUE: قطف البصيلات وإعادة زرعها.\n- تقنية DHI: زراعة مباشرة بأقلام تشوي وتعتبر الأحدث والأكثر دقة.",
    image: "https://images.unsplash.com/photo-1582716401301-b2407dc7563d?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-10",
    category: "زراعة الشعر",
    author: "فريق التحرير الطبي",
  },
  "fillers-vs-botox": {
    title: "الفرق بين الفيلر والبوتكس: متى تختارين أيهما؟",
    content: "كثيراً ما يتم الخلط بين الفيلر والبوتكس رغم أن لكل منهما وظيفة مختلفة تماماً.\n\n البوتكس: يعمل على إرخاء العضلات التي تسبب التجاعيد التعبيرية (مثل الجبهة وحول العينين).\n الفيلر: يستخدم لملء الفراغات واستعادة الحجم المفقود في الوجه (مثل الشفاه والخدود).",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-01",
    category: "الطب التجميلي",
    author: "د. سارة خالد",
  }
}

export function generateStaticParams() {
  return Object.keys(STATIC_POSTS).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = STATIC_POSTS[params.slug as keyof typeof STATIC_POSTS]
  if (!post) return { title: "المقال غير موجود" }
  return { title: `${post.title} | مد أورا` }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = STATIC_POSTS[params.slug as keyof typeof STATIC_POSTS]
  if (!post) notFound()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-background">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/blog" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
              <ChevronRight className="mr-1 size-4" />
              العودة للمدونة
            </Link>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {post.category}
              </span>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {new Date(post.date).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl md:text-5xl leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex items-center justify-between border-y border-border py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <User className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{post.author}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Share2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl mb-10 shadow-sm border border-border/80">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="prose prose-lg prose-slate max-w-none text-foreground/90 whitespace-pre-wrap">
            {post.content}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
