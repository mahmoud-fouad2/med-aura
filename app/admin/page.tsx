import Link from "next/link"
import { ClipboardCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { db } from "@/lib/db"
import { providerApplication } from "@/lib/db/schema"
import { inArray, count } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function AdminHome() {
  const pending = (
    await db
      .select({ n: count() })
      .from(providerApplication)
      .where(
        inArray(providerApplication.status, [
          "SUBMITTED",
          "UNDER_REVIEW",
          "NEEDS_CHANGES",
        ]),
      )
  )[0]?.n ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          لوحة الإدارة
        </h1>
        <p className="mt-1 text-muted-foreground">
          مراجعة طلبات مقدّمي الخدمة والإشراف على المنصة.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/applications">
          <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="size-5" />
            </span>
            <h3 className="mt-3 font-heading text-lg font-bold text-foreground">
              طلبات الانضمام
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {pending > 0 ? `${pending} طلب بانتظار المراجعة` : "لا توجد طلبات معلّقة"}
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
