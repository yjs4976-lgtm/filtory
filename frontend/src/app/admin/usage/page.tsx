"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import { adminUsageService, type AdminUsageFilters, type AdminUsageItem } from "@/services/adminUsageService"

const PAGE_SIZE = 20
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("ko-KR") : "-"

export default function AdminUsagePage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<AdminUsageFilters>({ usageType: "all", periodKey: "" })
  const [items, setItems] = useState<AdminUsageItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true); setError("")
      const result = await adminUsageService.getUsage({ ...filters, page, perPage: PAGE_SIZE })
      setItems(result.items); setTotal(result.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally { setIsLoading(false) }
  }, [filters, page, t.admin.loadFailed])

  useEffect(() => { const timer = window.setTimeout(loadData, 150); return () => window.clearTimeout(timer) }, [loadData])
  const updateFilters = (next: AdminUsageFilters) => { setFilters(next); setPage(1) }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return <AdminAppShell title="분석 사용량"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN USAGE</p><h1>분석 사용량</h1><p>서버에 기록된 상세 분석 사용량과 차감 유형을 확인하세요.</p></section>
    <section className="soft-card admin-table-card"><div className="admin-filter-grid">
      <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="기록 ID, 사용자, 병원" />
      <select value={filters.usageType} onChange={(event) => updateFilters({ ...filters, usageType: event.target.value as AdminUsageFilters["usageType"] })}><option value="all">전체 사용 유형</option><option value="FREE_BASE">Free 기본</option><option value="PLUS">Plus 테스트</option><option value="REWARDED">광고 보상</option><option value="ADMIN_GRANTED">관리자 지급</option></select>
      <input type="month" value={filters.periodKey ?? ""} onChange={(event) => updateFilters({ ...filters, periodKey: event.target.value })} aria-label="사용 기간" />
    </div></section>
    {isLoading && <p>{t.admin.loading}</p>}{error && <p className="form-error">{error}</p>}
    {!isLoading && <section className="soft-card admin-table-card"><div className="admin-card-title-row"><h2>사용량 로그</h2><span>{total}건</span></div><div className="table-scroll"><table className="admin-table">
      <thead><tr>{["기록 ID", "사용자", "분석 결과", "병원·진료과", "사용 유형", "기간", "차감 시각", "신뢰 점수"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.member?.nickname || item.member?.email || "-"}</td><td>{item.analysisResultId}</td><td>{item.hospital?.hospitalName ?? "-"}<br /><small>{item.hospital?.category ?? "-"}</small></td><td>{item.usageType}</td><td>{item.periodKey}</td><td>{formatDate(item.chargedAt)}</td><td>{item.trustScore ?? "-"}</td></tr>)}
      {items.length === 0 && <tr><td className="empty-cell" colSpan={8}>조회된 사용량 로그가 없습니다.</td></tr>}</tbody>
    </table></div>{totalPages > 1 && <div className="admin-pagination-controls"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button></div>}</section>}
  </AdminGuard></AdminAppShell>
}
