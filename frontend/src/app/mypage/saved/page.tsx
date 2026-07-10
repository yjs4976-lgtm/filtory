import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/routes"

export default function LegacySavedHospitalsPage() {
  redirect(ROUTES.MYPAGE_FAVORITE_HOSPITALS)
}
