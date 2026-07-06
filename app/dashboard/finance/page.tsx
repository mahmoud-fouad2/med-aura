import { redirect } from "next/navigation"

// The finance board lives inside the admin shell now (sidebar + header).
export default function LegacyFinanceRedirect() {
  redirect("/admin/finance")
}
