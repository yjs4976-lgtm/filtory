"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import { adminAnalysisService, type AdminAnalysisFilters, type AdminAnalysisItem } from "@/services/adminAnalysisService"

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR")
}

export default function AdminErrorsPage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<Omit<AdminAnalysisFilters, "status">>({ category: "all", analysisType: "all" })
  const [items, setItems] = useState<AdminAnalysisItem[]>([])
  const [selected, setSelected] = useState<AdminAnalysisItem | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<"reanalyze" | "resolve" | "notify_user" | null>(null)
  const [actionMessage, setActionMessage] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true); setError("")
      const result = await adminAnalysisService.getErrors({ ...filters, page, perPage: pageSize })
      setItems(result.items); setTotal(result.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally { setIsLoading(false) }
  }, [filters, page, pageSize, t.admin.loadFailed])

  useEffect(() => { const timer = window.setTimeout(loadData, 150); return () => window.clearTimeout(timer) }, [loadData])
  const updateFilters = (next: Omit<AdminAnalysisFilters, "status">) => { setFilters(next); setPage(1) }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const openDetail = (item: AdminAnalysisItem) => {
    setSelected(item)
    setActionMessage("")
  }

  const handleReanalyze = async () => {
    if (!selected || !window.confirm("원본 리뷰로 다시 분석할까요? 새 분석 요청이 생성됩니다.")) return
    try {
      setActionLoading("reanalyze")
      setActionMessage("")
      const result = await adminAnalysisService.reanalyze(selected.requestId)
      setActionMessage(`새 분석 요청 #${result.requestId}이 생성됐습니다.`)
      await loadData()
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "다시 분석하지 못했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleErrorAction = async (action: "resolve" | "notify_user") => {
    if (!selected) return
    try {
      setActionLoading(action)
      setActionMessage("")
      const result = await adminAnalysisService.updateError(selected.requestId, action)
      setSelected((current) => current ? { ...current, ...result } : current)
      setItems((current) => current.map((item) => (
        item.requestId === result.requestId ? { ...item, ...result } : item
      )))
      setActionMessage(action === "resolve" ? "처리 완료로 표시했습니다." : "사용자에게 안내 알림을 보냈습니다.")
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "요청을 처리하지 못했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  return <AdminAppShell title="분석 오류 관리"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN ERRORS</p><h1>분석 오류 관리</h1><p>실패한 분석 요청과 서버 오류 메시지를 조회하세요.</p></section>
    <section className="soft-card admin-table-card admin-error-filter">
      <div className="admin-error-filter-heading">
        <div><span>ERROR FILTER</span><h2>실패 요청 찾기</h2></div>
        <p>오류 메시지와 요청 정보를 빠르게 확인하세요.</p>
      </div>
      <div className="admin-filter-grid">
        <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="요청 ID, 병원, 사용자, 오류 메시지" />
        <select value={filters.category} onChange={(event) => updateFilters({ ...filters, category: event.target.value as AdminAnalysisFilters["category"] })}><option value="all">전체 진료과</option><option value="dermatology">피부과</option><option value="ophthalmology">안과</option><option value="dentistry">치과</option><option value="orthopedics">정형외과</option></select>
        <select value={filters.analysisType} onChange={(event) => updateFilters({ ...filters, analysisType: event.target.value as AdminAnalysisFilters["analysisType"] })}><option value="all">전체 분석 방식</option><option value="single_review">단일 리뷰</option><option value="multi_review">다중 리뷰</option><option value="place_only">장소 정보</option><option value="full">전체 분석</option></select>
      </div>
    </section>
    {isLoading && <p>{t.admin.loading}</p>}{error && <p className="form-error">{error}</p>}
    {!isLoading && <section className="soft-card admin-table-card admin-error-list-panel">
      <div className="admin-card-title-row"><div><span>FAILED REQUESTS</span><h2>실패 요청 목록</h2></div><strong>{total}건</strong></div>
      <div className="admin-error-card-list">
        {items.map((item) => <article key={item.requestId} className="admin-error-item">
          <header>
            <div><span>요청 #{item.requestId}</span><h3>{item.hospital?.hospitalName ?? "병원 정보 없음"}</h3></div>
            <strong>분석 실패</strong>
          </header>
          <p className="admin-error-message">{item.errorMessage ?? "오류 메시지 없음"}</p>
          <dl>
            <div><dt>사용자</dt><dd>{item.member?.nickname || item.member?.email || "-"}</dd></div>
            <div><dt>진료과</dt><dd>{categoryLabel(item.hospital?.category)}</dd></div>
            <div><dt>분석 방식</dt><dd>{analysisTypeLabel(item.analysisType)}</dd></div>
            <div><dt>발생 시각</dt><dd>{formatDate(item.completedAt ?? item.createdAt)}</dd></div>
          </dl>
          <footer><span>리뷰 {item.reviewCount}개{item.errorResolved ? " · 처리 완료" : ""}</span><button type="button" onClick={() => openDetail(item)}>상세 조회</button></footer>
        </article>)}
        {items.length === 0 && <p className="admin-error-empty">조회된 분석 오류가 없습니다.</p>}
      </div>
      {total > 0 && <>
        <div className="admin-pagination-controls" aria-label="분석 오류 페이지 이동">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← 이전</button>
          <span aria-current="page">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>다음 →</button>
        </div>
        <div className="admin-analysis-page-size">
          <select
            value={pageSize}
            aria-label="페이지당 분석 오류 수"
            onChange={(event) => {
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
              setPage(1)
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}개씩 보기</option>)}
          </select>
          <span>{rangeStart}-{rangeEnd} / 총 {total}건</span>
        </div>
      </>}
    </section>}
    {selected && <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="admin-user-drawer admin-analysis-drawer" role="dialog" aria-modal="true"><button className="admin-drawer-close" onClick={() => setSelected(null)} aria-label="닫기"><X /></button><header className="admin-analysis-drawer-heading"><span>ERROR DETAIL</span><h2>오류 상세</h2><p>요청 #{selected.requestId}</p></header><dl>{[["사용자", selected.member?.nickname || selected.member?.email || "-"], ["병원", selected.hospital?.hospitalName ?? "-"], ["분석 방식", analysisTypeLabel(selected.analysisType)], ["리뷰 수", `${selected.reviewCount}개`], ["발생 시각", formatDate(selected.completedAt ?? selected.createdAt)], ["오류 메시지", selected.errorMessage ?? "-"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{actionMessage && <p className="admin-analysis-action-message" role="status">{actionMessage}</p>}<div className="admin-drawer-actions"><button type="button" onClick={handleReanalyze} disabled={actionLoading !== null || selected.retryAvailable === false}>{actionLoading === "reanalyze" ? "다시 분석 중…" : "다시 분석"}</button><button type="button" onClick={() => handleErrorAction("resolve")} disabled={actionLoading !== null || selected.errorResolved}>{selected.errorResolved ? "처리 완료됨" : actionLoading === "resolve" ? "처리 중…" : "처리 완료 표시"}</button><button type="button" onClick={() => handleErrorAction("notify_user")} disabled={actionLoading !== null || selected.userNotified || !selected.member}>{selected.userNotified ? "안내 완료" : actionLoading === "notify_user" ? "알림 전송 중…" : "사용자 안내 알림"}</button></div></section></div>}
  </AdminGuard></AdminAppShell>
}

function categoryLabel(value?: string | null) {
  return ({ dermatology: "피부과", ophthalmology: "안과", dentistry: "치과", orthopedics: "정형외과" } as Record<string, string>)[value ?? ""] ?? "미지정"
}

function analysisTypeLabel(value: string) {
  return ({ single_review: "단일 리뷰", multi_review: "다중 리뷰", place_only: "장소 정보", full: "전체 분석" } as Record<string, string>)[value] ?? value
}
