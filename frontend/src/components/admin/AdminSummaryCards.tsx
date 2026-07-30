"use client"

import { useEffect, useState } from "react"
import { Maximize2, X } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { AdminSummary } from "@/lib/types"

interface AdminSummaryCardsProps {
  summary: AdminSummary
}

export function AdminSummaryCards({ summary }: AdminSummaryCardsProps) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState<"members" | "operations" | null>(null)
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

  useEffect(() => {
    if (!expanded) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(null)
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [expanded])

  return (
    <>
    <div className="admin-summary-sections">
      <section aria-label="회원 운영 요약">
        <header><div><span>MEMBERS</span><h2>회원 현황</h2></div><div className="admin-summary-heading-actions"><p>가입 회원과 계정 상태</p><button type="button" onClick={() => setExpanded("members")} aria-label="회원 현황 확대"><Maximize2 /><span>확대</span></button></div></header>
        <div className="admin-summary-grid">{memberMetrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
      </section>
      <section aria-label="서비스 운영 요약">
        <header><div><span>OPERATIONS</span><h2>운영 현황</h2></div><div className="admin-summary-heading-actions"><p>분석·문의·병원 운영 지표</p><button type="button" onClick={() => setExpanded("operations")} aria-label="운영 현황 확대"><Maximize2 /><span>확대</span></button></div></header>
        <div className="admin-summary-grid">{operationMetrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
      </section>
    </div>
    {expanded && (
      <div className="admin-summary-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setExpanded(null)}>
        <section className="admin-summary-modal" role="dialog" aria-modal="true" aria-labelledby="admin-summary-modal-title">
          <header>
            <div><span>{expanded === "members" ? "MEMBERS DASHBOARD" : "OPERATIONS DASHBOARD"}</span><h2 id="admin-summary-modal-title">{expanded === "members" ? "회원 현황 상세" : "운영 현황 상세"}</h2><p>현재 서버 집계값을 기준으로 표시합니다.</p></div>
            <button type="button" onClick={() => setExpanded(null)} aria-label="확대 화면 닫기"><X /></button>
          </header>
          {expanded === "members"
            ? <MemberDashboard summary={summary} metrics={memberMetrics} />
            : <OperationsDashboard summary={summary} metrics={operationMetrics} />}
        </section>
      </div>
    )}
    </>
  )
}

function SummaryCard({ label, value }: { label: string; value?: number }) {
  return <div className="admin-summary-card"><span aria-hidden="true" /><p>{label}</p><strong>{value ?? 0}</strong></div>
}

function MemberDashboard({ summary, metrics }: { summary: AdminSummary; metrics: readonly (readonly [string, number | undefined])[] }) {
  const total = Math.max(summary.totalUsers ?? 0, 1)
  const rows = [
    ["활성 회원", summary.activeUsers ?? 0],
    ["정지 회원", summary.suspendedUsers ?? 0],
    ["탈퇴 회원", summary.withdrawnUsers ?? 0],
  ] as const
  return <div className="admin-summary-modal-content">
    <div className="admin-summary-modal-kpis">{metrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
    <section className="admin-summary-chart-panel"><header><h3>회원 상태 구성</h3><span>전체 회원 대비</span></header><div className="admin-summary-bars">{rows.map(([label, value]) => <RatioBar key={label} label={label} value={value} total={total} />)}</div></section>
  </div>
}

function OperationsDashboard({ summary, metrics }: { summary: AdminSummary; metrics: readonly (readonly [string, number | undefined])[] }) {
  const totalAnalyses = Math.max(summary.totalAnalyses ?? 0, 1)
  const totalHospitals = Math.max(summary.totalHospitals ?? 0, 1)
  return <div className="admin-summary-modal-content">
    <div className="admin-summary-modal-kpis">{metrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
    <div className="admin-summary-chart-grid">
      <section className="admin-summary-chart-panel"><header><h3>분석 운영 지표</h3><span>전체 분석 대비</span></header><div className="admin-summary-bars"><RatioBar label="이번 달 분석" value={summary.monthAnalyses ?? 0} total={totalAnalyses} /><RatioBar label="실패 분석" value={summary.failedAnalyses ?? 0} total={totalAnalyses} /><RatioBar label="확인 필요 품질" value={summary.pendingReviewCases ?? 0} total={totalAnalyses} /></div></section>
      <section className="admin-summary-chart-panel"><header><h3>병원 검토 현황</h3><span>등록 병원 대비</span></header><div className="admin-summary-bars"><RatioBar label="정상·검토 완료" value={Math.max((summary.totalHospitals ?? 0) - (summary.needsReviewHospitals ?? 0), 0)} total={totalHospitals} /><RatioBar label="검토 필요 병원" value={summary.needsReviewHospitals ?? 0} total={totalHospitals} /></div><div className="admin-summary-open-inquiry"><span>현재 열린 문의</span><strong>{summary.openInquiries ?? 0}건</strong></div></section>
    </div>
  </div>
}

function RatioBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / Math.max(total, 1)) * 100)))
  return <div><div><span>{label}</span><strong>{value} <small>{percentage}%</small></strong></div><span className="admin-summary-bar-track"><i style={{ width: `${percentage}%` }} /></span></div>
}
