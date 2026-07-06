"use client"

import { useLanguage } from "@/context/LanguageContext"

export function AdminUserSanctionHistory() {
  const { t } = useLanguage()

  return (
    <section className="soft-card admin-table-card">
      <h2>{t.admin.sanctionTitle}</h2>
      <p>{t.admin.sanctionEmpty}</p>
    </section>
  )
}
