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

const PAGE_SIZE = 20
const ACTIONS = [
  "member_update", "member_deactivate", "hospital_create", "hospital_update", "hospital_delete",
  "review_update", "review_delete", "analysis_review", "report_resolve", "subscription_update", "login",
]
const RESOURCES = ["members", "hospitals", "reviews", "analysis_results", "review_reports"]

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
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await adminAuditLogService.getAuditLogs({ ...filters, page, perPage: PAGE_SIZE })
      setItems(result.items)
      setTotal(result.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, t.admin.loadFailed])

  useEffect(() => {
    const timer = window.setTimeout(loadData, 150)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const updateFilters = (next: AdminAuditLogFilters) => {
    setFilters(next)
    setPage(1)
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return <AdminAppShell title="관리자 활동 기록"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN AUDIT</p><h1>관리자 활동 기록</h1><p>관리자 계정의 주요 변경 이력을 읽기 전용으로 확인하세요.</p></section>
    <section className="soft-card admin-table-card"><div className="admin-filter-grid">
      <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="로그 ID, 관리자, 작업, 대상 검색" />
      <select value={filters.action ?? ""} onChange={(event) => updateFilters({ ...filters, action: event.target.value })}><option value="">전체 작업</option>{ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}</select>
      <select value={filters.resourceType ?? ""} onChange={(event) => updateFilters({ ...filters, resourceType: event.target.value })}><option value="">전체 대상</option>{RESOURCES.map((resource) => <option key={resource} value={resource}>{resource}</option>)}</select>
      <input type="number" min="1" value={filters.adminId ?? ""} onChange={(event) => updateFilters({ ...filters, adminId: event.target.value })} placeholder="관리자 ID" />
    </div></section>
    {isLoading && <p>{t.admin.loading}</p>}
    {error && <p className="form-error">{error}</p>}
    {!isLoading && <section className="soft-card admin-table-card">
      <div className="admin-card-title-row"><h2>감사 로그</h2><span>{total}건</span></div>
      <div className="table-scroll"><table className="admin-table">
        <thead><tr>{["로그 ID", "관리자", "작업", "대상", "설명", "IP", "발생 시각"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>
          {items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{adminLabel(item)}</td><td>{item.action}</td><td>{item.resourceType ?? "-"} {item.resourceId ? `#${item.resourceId}` : ""}</td><td>{item.description ?? "-"}</td><td>{item.ipAddress ?? "-"}</td><td>{formatDate(item.createdAt)}</td></tr>)}
          {items.length === 0 && <tr><td className="empty-cell" colSpan={7}>조회된 관리자 활동 기록이 없습니다.</td></tr>}
        </tbody>
      </table></div>
      {totalPages > 1 && <div className="admin-pagination-controls"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button></div>}
    </section>}
  </AdminGuard></AdminAppShell>
}
