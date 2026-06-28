import { redirect } from "next/navigation"

// /doctors is the search experience filtered to doctors.
export default function DoctorsIndex() {
  redirect("/search")
}
