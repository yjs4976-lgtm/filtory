"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import { adminAnalysisService, type AdminAnalysisFilters, type AdminAnalysisItem } from "@/services/adminAnalysisService"

const PAGE_SIZE = 20
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("ko-KR") : "-"

export default function AdminErrorsPage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<Omit<AdminAnalysisFilters, "status">>({ category: "all", analysisType: "all" })
  const [items, setItems] = useState<AdminAnalysisItem[]>([])
  const [selected, setSelected] = useState<AdminAnalysisItem | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true); setError("")
      const result = await adminAnalysisService.getErrors({ ...filters, page, perPage: PAGE_SIZE })
      setItems(result.items); setTotal(result.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally { setIsLoading(false) }
  }, [filters, page, t.admin.loadFailed])

  useEffect(() => { const timer = window.setTimeout(loadData, 150); return () => window.clearTimeout(timer) }, [loadData])
  const updateFilters = (next: Omit<AdminAnalysisFilters, "status">) => { setFilters(next); setPage(1) }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return <AdminAppShell title="분석 오류 관리"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN ERRORS</p><h1>분석 오류 관리</h1><p>실패한 분석 요청과 서버 오류 메시지를 조회하세요.</p></section>
    <section className="soft-card admin-table-card"><div className="admin-filter-grid">
      <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="요청 ID, 병원, 사용자, 오류 메시지" />
      <select value={filters.category} onChange={(event) => updateFilters({ ...filters, category: event.target.value as AdminAnalysisFilters["category"] })}><option value="all">전체 진료과</option><option value="dermatology">피부과</option><option value="ophthalmology">안과</option><option value="dentistry">치과</option></select>
      <select value={filters.analysisType} onChange={(event) => updateFilters({ ...filters, analysisType: event.target.value as AdminAnalysisFilters["analysisType"] })}><option value="all">전체 분석 방식</option><option value="single_review">단일 리뷰</option><option value="multi_review">다중 리뷰</option><option value="place_only">장소 정보</option><option value="full">전체 분석</option></select>
    </div></section>
    {isLoading && <p>{t.admin.loading}</p>}{error && <p className="form-error">{error}</p>}
    {!isLoading && <section className="soft-card admin-table-card"><div className="admin-card-title-row"><h2>실패 요청</h2><span>{total}건</span></div><div className="table-scroll"><table className="admin-table">
      <thead><tr>{["요청 ID", "오류", "사용자", "병원·진료과", "발생 시각", "상태", "관리"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{items.map((item) => <tr key={item.requestId}><td>{item.requestId}</td><td>{item.errorMessage ?? "오류 메시지 없음"}</td><td>{item.member?.nickname || item.member?.email || "-"}</td><td>{item.hospital?.hospitalName ?? "-"}<br /><small>{item.hospital?.category ?? "-"}</small></td><td>{formatDate(item.completedAt ?? item.createdAt)}</td><td>{item.status}</td><td><button className="small-button" onClick={() => setSelected(item)}>조회</button></td></tr>)}
      {items.length === 0 && <tr><td className="empty-cell" colSpan={7}>조회된 분석 오류가 없습니다.</td></tr>}</tbody>
    </table></div>{totalPages > 1 && <div className="admin-pagination-controls"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button></div>}</section>}
    {selected && <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="admin-user-drawer" role="dialog" aria-modal="true"><button className="admin-drawer-close" onClick={() => setSelected(null)} aria-label="닫기"><X /></button><h2>오류 상세</h2><p>요청 {selected.requestId}</p><dl>{[["사용자", selected.member?.nickname || selected.member?.email || "-"], ["병원", selected.hospital?.hospitalName ?? "-"], ["분석 방식", selected.analysisType], ["리뷰 수", String(selected.reviewCount)], ["발생 시각", formatDate(selected.completedAt ?? selected.createdAt)], ["오류 메시지", selected.errorMessage ?? "-"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="admin-drawer-actions">{["다시 분석", "처리 완료 표시", "사용자 안내 필요"].map((label) => <button key={label} disabled title="변경 API 연결이 필요한 기능입니다">{label} · API 연결 필요</button>)}</div></section></div>}
  </AdminGuard></AdminAppShell>
}
