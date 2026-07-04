"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSummaryCards } from "@/components/admin/AdminSummaryCards"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AdminSummary } from "@/lib/types"
import { adminService } from "@/services/adminService"

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const { t } = useLanguage()
  const [summary, setSummary] = useState<AdminSummary | null>(null)

  useEffect(() => {
    if (!isAdmin) return

    let alive = true

    adminService.getSummary().then((result) => {
      if (alive) setSummary(result.data)
    }).catch(() => {
      if (alive) setSummary(null)
    })

    return () => {
      alive = false
    }
  }, [isAdmin])

  return (
    <AdminAppShell title={t.nav.admin}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN</p>
          <h1>{t.admin.dashboard}</h1>
          <p>{t.admin.dashboardDescription}</p>
        </section>

        {summary && <AdminSummaryCards summary={summary} />}

        <section className="admin-menu-grid">
          <Link href={ROUTES.ADMIN_USERS} className="soft-card admin-menu-card">
            <strong>{t.admin.menuUsersTitle}</strong>
            <p>{t.admin.menuUsersDescription}</p>
          </Link>

          <Link href={ROUTES.ADMIN_REVIEWS} className="soft-card admin-menu-card">
            <strong>{t.admin.menuReviewsTitle}</strong>
            <p>{t.admin.menuReviewsDescription}</p>
          </Link>

          <Link href={ROUTES.ADMIN_HOSPITALS} className="soft-card admin-menu-card">
            <strong>{t.admin.menuHospitalsTitle}</strong>
            <p>{t.admin.menuHospitalsDescription}</p>
          </Link>

          <Link href={ROUTES.ADMIN_INQUIRIES} className="soft-card admin-menu-card">
            <strong>{t.admin.menuInquiriesTitle}</strong>
            <p>{t.admin.menuInquiriesDescription}</p>
          </Link>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
