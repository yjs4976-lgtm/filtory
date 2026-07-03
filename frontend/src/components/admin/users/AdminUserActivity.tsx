"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AnalysisHistoryItem, MyReport, SavedHospital } from "@/lib/types"

interface AdminUserActivityProps {
  analysisHistory: AnalysisHistoryItem[]
  savedHospitals: SavedHospital[]
  reports: MyReport[]
}

export function AdminUserActivity({ analysisHistory, savedHospitals, reports }: AdminUserActivityProps) {
  const { t } = useLanguage()

  return (
    <section className="soft-card admin-table-card">
      <h2>{t.admin.activityTitle}</h2>
      <div className="admin-summary-grid">
        <article>
          <strong>{analysisHistory.length}</strong>
          <span>{t.admin.activityAnalysis}</span>
        </article>
        <article>
          <strong>{savedHospitals.length}</strong>
          <span>{t.admin.activitySaved}</span>
        </article>
        <article>
          <strong>{reports.length}</strong>
          <span>{t.admin.activityReports}</span>
        </article>
      </div>
    </section>
  )
}
