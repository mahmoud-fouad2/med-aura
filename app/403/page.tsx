import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/layout/page-shell"

export const metadata = { title: "غير مصرّح" }

export default function ForbiddenPage() {
  return (
    <PageShell title="غير مصرّح بالوصول">
      <p className="text-muted-foreground">
        ليست لديك صلاحية للوصول إلى هذه الصفحة. إذا كنت تعتقد أن هذا خطأ، تواصل مع
        فريق الدعم.
      </p>
      <Button render={<Link href="/dashboard">الذهاب إلى لوحتك</Link>} />
    </PageShell>
  )
}
