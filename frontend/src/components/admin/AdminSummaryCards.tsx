"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AdminSummary } from "@/lib/types"

interface AdminSummaryCardsProps {
  summary: AdminSummary
}

export function AdminSummaryCards({ summary }: AdminSummaryCardsProps) {
  const { t } = useLanguage()
  const memberMetrics = [
    [t.admin.summaryTotalUsers, summary.totalUsers],
    [t.admin.summaryActiveUsers, summary.activeUsers],
    [t.admin.summarySuspendedUsers, summary.suspendedUsers],
    [t.admin.summaryWithdrawnUsers, summary.withdrawnUsers],
  ] as const
  const operationMetrics = [
    ["전체 분석", summary.totalAnalyses],
    ["오늘 분석", summary.todayAnalyses],
    ["이번 달 분석", summary.monthAnalyses],
    ["실패 분석", summary.failedAnalyses],
    ["확인 필요 품질", summary.pendingReviewCases],
    ["열린 문의", summary.openInquiries],
    ["전체 병원", summary.totalHospitals],
    ["검토 필요 병원", summary.needsReviewHospitals],
  ] as const

  return (
    <div className="admin-summary-sections">
      <section aria-label="회원 운영 요약">
        <h2>회원 현황</h2>
        <div className="admin-summary-grid">{memberMetrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
      </section>
      <section aria-label="서비스 운영 요약">
        <h2>운영 현황</h2>
        <div className="admin-summary-grid">{operationMetrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value?: number }) {
  return <div className="admin-summary-card"><span aria-hidden="true" /><p>{label}</p><strong>{value ?? 0}</strong></div>
}
