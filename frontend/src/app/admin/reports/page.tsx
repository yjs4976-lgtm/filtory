import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/routes"

export default function AdminReportsPage() {
  redirect(ROUTES.ADMIN_REVIEWS)
}
