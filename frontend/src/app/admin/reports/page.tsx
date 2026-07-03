"use client"

import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"

export default function AdminReportsPage() {
  const { t } = useLanguage()

  return (
    <AdminAppShell title={t.admin.reports}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN REPORTS</p>
          <h1>{t.admin.reportsTitle}</h1>
          <p>{t.admin.reportsDescription}</p>
        </section>

        <section className="soft-card">
          <p>{t.admin.reportsTablePending}</p>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
