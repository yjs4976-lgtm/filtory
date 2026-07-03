"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AdminSummary } from "@/lib/types"

interface AdminSummaryCardsProps {
  summary: AdminSummary
}

export function AdminSummaryCards({ summary }: AdminSummaryCardsProps) {
  const { t } = useLanguage()

  return (
    <section className="admin-summary-grid">
      <div className="soft-card">
        <p>{t.admin.summaryTotalUsers}</p>
        <strong>{summary.totalUsers}</strong>
      </div>

      <div className="soft-card">
        <p>{t.admin.summaryActiveUsers}</p>
        <strong>{summary.activeUsers}</strong>
      </div>

      <div className="soft-card">
        <p>{t.admin.summarySuspendedUsers}</p>
        <strong>{summary.suspendedUsers}</strong>
      </div>

      <div className="soft-card">
        <p>{t.admin.summaryWithdrawnUsers}</p>
        <strong>{summary.withdrawnUsers}</strong>
      </div>
    </section>
  )
}
