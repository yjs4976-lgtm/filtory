"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Activity, Bot, Clock3, Database, FileClock, MessageCircle, RefreshCw, Server, TriangleAlert } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { ROUTES } from "@/lib/routes"
import { useLanguage } from "@/context/LanguageContext"
import { adminSystemService, type AdminSystemStatus } from "@/services/adminSystemService"

const displayValue = (value?: number | null) => value == null ? "-" : value.toLocaleString("ko-KR")

export default function AdminSystemPage() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<AdminSystemStatus | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      setStatus(await adminSystemService.getStatus())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [t.admin.loadFailed])

  useEffect(() => {
    const timer = window.setTimeout(loadStatus, 0)
    return () => window.clearTimeout(timer)
  }, [loadStatus])

  return (
    <AdminAppShell title="시스템 상태">
      <AdminGuard>
        <section className="page-title admin-system-title">
          <p className="eyebrow">ADMIN SYSTEM</p>
          <h1>시스템 상태</h1>
          <p>서비스 연결 상태와 운영 지표를 안전하게 확인하세요.</p>
        </section>

        <section className="admin-system-health">
          <header>
            <div><span>LIVE HEALTH</span><h2>서비스 연결 상태</h2></div>
            <button type="button" onClick={loadStatus} disabled={isLoading}><RefreshCw className={isLoading ? "is-spinning" : ""} /> {isLoading ? "확인 중…" : "새로고침"}</button>
          </header>
          {error && <p className="form-error">{error}</p>}
          <div className="admin-system-service-grid">
            <ServiceStatus icon={<Server />} label="메인 API" value={status?.backendMain} loading={isLoading && !status} />
            <ServiceStatus icon={<Database />} label="데이터베이스" value={status?.database} loading={isLoading && !status} />
            <ServiceStatus icon={<Bot />} label="AI 분석 서버" value={status?.backendAi} detail={status?.backendAiLatencyMs == null ? undefined : `${status.backendAiLatencyMs}ms`} loading={isLoading && !status} />
          </div>
        </section>

        {status && (
          <>
            <section className="admin-system-metrics">
              <header><div><span>OPERATIONS</span><h2>분석·지원 현황</h2></div><p>서버에 기록된 현재 운영 건수</p></header>
              <div>
                <Metric icon={<Clock3 />} label="대기 분석" value={status.pendingAnalyses} />
                <Metric icon={<Activity />} label="분석 중" value={status.analyzingAnalyses} />
                <Metric icon={<TriangleAlert />} label="실패 분석" value={status.failedAnalyses} />
                <Metric icon={<FileClock />} label="최근 24시간 실패" value={status.recentFailedAnalyses} />
                <Metric icon={<MessageCircle />} label="열린 문의" value={status.openInquiries} />
                <Metric icon={<Database />} label="전체 분석" value={status.totalAnalyses} />
              </div>
            </section>

            <section className="admin-system-footer-card">
              <div>
                <span>마지막 확인</span>
                <strong>{new Date(status.serverTime).toLocaleString("ko-KR")}</strong>
                <small>오늘 관리자 감사 로그 {displayValue(status.auditLogsToday)}건</small>
              </div>
              <nav aria-label="시스템 관련 관리 화면">
                <Link href={ROUTES.ADMIN_ERRORS}>오류 관리</Link>
                <Link href={ROUTES.ADMIN_AUDIT_LOGS}>감사 로그</Link>
                <Link href={ROUTES.ADMIN_INQUIRIES}>문의 관리</Link>
              </nav>
            </section>
          </>
        )}

        <p className="admin-system-readonly-note">이 화면은 조회 전용입니다. 재시작·캐시 삭제·작업 강제 종료는 운영 인프라 권한이 필요한 기능이라 제공하지 않습니다.</p>
      </AdminGuard>
    </AdminAppShell>
  )
}

function ServiceStatus({ icon, label, value, detail, loading }: { icon: React.ReactNode; label: string; value?: string; detail?: string; loading: boolean }) {
  const normalized = loading ? "loading" : value ?? "error"
  const text = loading ? "확인 중" : ({ ok: "정상", error: "연결 실패", not_configured: "설정 필요" } as Record<string, string>)[normalized] ?? "확인 필요"
  return <article className={`status-${normalized}`}><div>{icon}</div><span>{label}</span><strong>{text}</strong>{detail && <small>{detail}</small>}</article>
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number | null }) {
  return <article><div>{icon}</div><span>{label}</span><strong>{displayValue(value)}</strong></article>
}
