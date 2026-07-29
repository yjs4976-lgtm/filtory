"use client"

import { useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import { adminSystemService, type AdminSystemStatus } from "@/services/adminSystemService"

const displayValue = (value?: number | null) => value == null ? "-" : String(value)

export default function AdminSystemPage() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<AdminSystemStatus | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    adminSystemService.getStatus()
      .then((data) => { if (alive) setStatus(data) })
      .catch((loadError) => { if (alive) setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed) })
      .finally(() => { if (alive) setIsLoading(false) })
    return () => { alive = false }
  }, [t.admin.loadFailed])

  return <AdminAppShell title="시스템 상태"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN SYSTEM</p><h1>시스템 상태</h1><p>현재 화면은 상태 조회 전용입니다.</p></section>
    <p className="admin-unlimited-note">재시작·재처리·캐시 삭제 기능은 아직 제공하지 않아요.</p>
    {isLoading && <p>{t.admin.loading}</p>}{error && <p className="form-error">{error}</p>}
    {status && <>
      <div className="admin-compact-kpis">{[
        ["메인 API", status.backendMain], ["데이터베이스", status.database], ["AI 분석 서버", status.backendAi],
        ["대기 분석", displayValue(status.pendingAnalyses)], ["분석 중", displayValue(status.analyzingAnalyses)],
        ["실패 분석", displayValue(status.failedAnalyses)], ["최근 실패", displayValue(status.recentFailedAnalyses)],
        ["열린 문의", displayValue(status.openInquiries)],
      ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <section className="soft-card admin-table-card"><h2>조회 기준</h2><p>서버 시간: {new Date(status.serverTime).toLocaleString("ko-KR")}</p><p>오늘 감사 로그: {displayValue(status.auditLogsToday)}건 · 전체 분석: {displayValue(status.totalAnalyses)}건</p></section>
    </>}
  </AdminGuard></AdminAppShell>
}
