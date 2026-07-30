"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import {
  adminAuditLogService,
  type AdminAuditLog,
  type AdminAuditLogFilters,
} from "@/services/adminAuditLogService"

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const
const ACTIONS = [
  "member_update", "member_deactivate", "hospital_create", "hospital_update", "hospital_delete",
  "review_update", "review_delete", "analysis_review", "report_resolve", "subscription_update", "login",
]
const RESOURCES = ["members", "hospitals", "reviews", "analysis_results", "analysis_requests", "review_reports", "admin_review_moderation_cases"]

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR")
}

function adminLabel(log: AdminAuditLog) {
  return log.admin?.nickname || log.admin?.email || (log.adminId ? `관리자 #${log.adminId}` : "-")
}

export default function AdminAuditLogsPage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<AdminAuditLogFilters>({})
  const [items, setItems] = useState<AdminAuditLog[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await adminAuditLogService.getAuditLogs({ ...filters, page, perPage: pageSize })
      setItems(result.items)
      setTotal(result.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, pageSize, t.admin.loadFailed])

  useEffect(() => {
    const timer = window.setTimeout(loadData, 150)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const updateFilters = (next: AdminAuditLogFilters) => {
    setFilters(next)
    setPage(1)
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return <AdminAppShell title="관리자 활동 기록"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN AUDIT</p><h1>관리자 활동 기록</h1><p>관리자 계정의 주요 변경 이력을 읽기 전용으로 확인하세요.</p></section>
    <section className="soft-card admin-table-card admin-audit-filter">
      <div className="admin-audit-filter-heading"><div><span>AUDIT FILTER</span><h2>활동 기록 찾기</h2></div><p>작업과 대상, 관리자 기준으로 변경 이력을 확인하세요.</p></div>
      <div className="admin-filter-grid">
        <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="로그 ID, 관리자, 작업, 대상 검색" />
        <select value={filters.action ?? ""} onChange={(event) => updateFilters({ ...filters, action: event.target.value })}><option value="">전체 작업</option>{ACTIONS.map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}</select>
        <select value={filters.resourceType ?? ""} onChange={(event) => updateFilters({ ...filters, resourceType: event.target.value })}><option value="">전체 대상</option>{RESOURCES.map((resource) => <option key={resource} value={resource}>{resourceLabel(resource)}</option>)}</select>
        <input type="number" min="1" value={filters.adminId ?? ""} onChange={(event) => updateFilters({ ...filters, adminId: event.target.value })} placeholder="관리자 ID" />
      </div>
    </section>
    {isLoading && <p>{t.admin.loading}</p>}
    {error && <p className="form-error">{error}</p>}
    {!isLoading && <section className="soft-card admin-table-card admin-audit-list-panel">
      <div className="admin-card-title-row"><div><span>ADMIN ACTIVITY</span><h2>감사 로그</h2></div><strong>{total}건</strong></div>
      <div className="admin-audit-card-list">
        {items.map((item) => <article key={item.id} className="admin-audit-item">
          <header><div><span>로그 #{item.id}</span><h3>{actionLabel(item.action)}</h3></div><strong>읽기 전용</strong></header>
          <dl>
            <div><dt>관리자</dt><dd>{adminLabel(item)}</dd></div>
            <div><dt>대상</dt><dd>{resourceLabel(item.resourceType)}{item.resourceId ? ` #${item.resourceId}` : ""}</dd></div>
            <div><dt>발생 시각</dt><dd>{formatDate(item.createdAt)}</dd></div>
            <div><dt>접속 IP</dt><dd>{item.ipAddress ?? "-"}</dd></div>
          </dl>
          <footer><span>설명</span><p>{item.description ?? "별도 설명 없이 변경 이력만 기록됐습니다."}</p></footer>
        </article>)}
        {items.length === 0 && <p className="admin-audit-empty">조회된 관리자 활동 기록이 없습니다.</p>}
      </div>
      {total > 0 && <>
        <div className="admin-pagination-controls" aria-label="감사 로그 페이지 이동"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← 이전</button><span aria-current="page">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>다음 →</button></div>
        <div className="admin-analysis-page-size">
          <select value={pageSize} aria-label="페이지당 감사 로그 수" onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]); setPage(1) }}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}개씩 보기</option>)}
          </select>
          <span>{rangeStart}-{rangeEnd} / 총 {total}건</span>
        </div>
      </>}
    </section>}
  </AdminGuard></AdminAppShell>
}

function actionLabel(value: string) {
  return ({
    member_update: "회원 정보 변경",
    member_deactivate: "회원 비활성화",
    hospital_create: "병원 등록",
    hospital_update: "병원 정보 변경",
    hospital_delete: "병원 삭제",
    review_update: "리뷰 검토 변경",
    review_delete: "리뷰 삭제",
    analysis_review: "분석 검토",
    report_resolve: "신고 처리",
    subscription_update: "멤버십 변경",
    login: "관리자 로그인",
  } as Record<string, string>)[value] ?? value
}

function resourceLabel(value?: string | null) {
  return ({
    members: "회원",
    hospitals: "병원",
    reviews: "리뷰",
    analysis_results: "분석 결과",
    analysis_requests: "분석 요청",
    review_reports: "사용자 신고",
    admin_review_moderation_cases: "관리자 검토 항목",
  } as Record<string, string>)[value ?? ""] ?? value ?? "-"
}
