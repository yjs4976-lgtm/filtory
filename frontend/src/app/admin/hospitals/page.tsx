"use client"

import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"

export default function AdminHospitalsPage() {
  const { t } = useLanguage()

  return (
    <AdminAppShell title={t.admin.hospitals}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN HOSPITALS</p>
          <h1>{t.admin.hospitalsTitle}</h1>
          <p>{t.admin.hospitalsDescription}</p>
        </section>

        <section className="soft-card">
          <p>{t.admin.hospitalsTablePending}</p>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
