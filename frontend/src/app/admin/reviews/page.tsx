"use client"

import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"

export default function AdminReviewsPage() {
  const { t } = useLanguage()

  return (
    <AdminAppShell title={t.admin.reviews}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN REVIEWS</p>
          <h1>{t.admin.reviewsTitle}</h1>
          <p>{t.admin.reviewsDescription}</p>
        </section>

        <section className="soft-card">
          <p>{t.admin.reviewsTablePending}</p>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
