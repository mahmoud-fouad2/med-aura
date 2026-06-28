import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <div>
        <p className="font-heading text-6xl font-extrabold text-primary">404</p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">
          الصفحة غير موجودة
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          عذرًا، الصفحة التي تبحث عنها غير متاحة أو تم نقلها.
        </p>
      </div>
      <Button render={<Link href="/">العودة إلى الصفحة الرئيسية</Link>} />
    </main>
  )
}
