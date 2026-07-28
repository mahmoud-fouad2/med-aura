import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { CreateTicketForm } from "@/components/support/create-ticket-form"

export const metadata = { title: "تذكرة جديدة" }

export default function NewSupportTicketPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/support" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" /> الدعم
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">تذكرة جديدة</h1>
      </div>
      <CreateTicketForm />
    </div>
  )
}
