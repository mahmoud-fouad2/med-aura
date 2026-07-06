import { redirect } from "next/navigation"

// The operations board lives inside the admin shell now (sidebar + header).
export default function LegacyConciergeRedirect() {
  redirect("/admin/concierge")
}
