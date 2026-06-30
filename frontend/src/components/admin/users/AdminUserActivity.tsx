import type { AnalysisHistoryItem, MyReport, SavedHospital } from "@/lib/types"

interface AdminUserActivityProps {
  analysisHistory: AnalysisHistoryItem[]
  savedHospitals: SavedHospital[]
  reports: MyReport[]
}

export function AdminUserActivity({ analysisHistory, savedHospitals, reports }: AdminUserActivityProps) {
  return (
    <section className="soft-card admin-table-card">
      <h2>서비스 이용 정보</h2>
      <div className="admin-summary-grid">
        <article>
          <strong>{analysisHistory.length}</strong>
          <span>분석 기록</span>
        </article>
        <article>
          <strong>{savedHospitals.length}</strong>
          <span>저장 병원</span>
        </article>
        <article>
          <strong>{reports.length}</strong>
          <span>검토 내역</span>
        </article>
      </div>
    </section>
  )
}
