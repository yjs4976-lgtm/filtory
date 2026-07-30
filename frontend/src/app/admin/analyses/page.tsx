"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import {
  adminAnalysisService,
  type AdminAnalysisFilters,
  type AdminAnalysisItem,
} from "@/services/adminAnalysisService"

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR")
}

function memberLabel(item: AdminAnalysisItem) {
  return item.member?.nickname || item.member?.email || "-"
}

export default function AdminAnalysesPage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<AdminAnalysisFilters>({
    status: "all",
    category: "all",
    analysisType: "all",
  })
  const [items, setItems] = useState<AdminAnalysisItem[]>([])
  const [selected, setSelected] = useState<AdminAnalysisItem | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [adminMemo, setAdminMemo] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await adminAnalysisService.getAnalyses({ ...filters, page, perPage: pageSize })
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

  const updateFilters = (next: AdminAnalysisFilters) => {
    setFilters(next)
    setPage(1)
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const openDetail = (item: AdminAnalysisItem) => {
    setSelected(item)
    setAdminMemo(item.adminMemo ?? "")
    setActionMessage("")
  }

  const applyReviewResult = (result: {
    reviewCaseId: number
    reviewStatus: "pending" | "reviewing" | "resolved"
    adminMemo?: string | null
  }) => {
    setSelected((current) => current ? { ...current, ...result } : current)
    setItems((current) => current.map((item) => (
      item.requestId === selected?.requestId ? { ...item, ...result } : item
    )))
    setAdminMemo(result.adminMemo ?? "")
  }

  const updateReview = async (action: "needs_review" | "confirm" | "memo") => {
    if (!selected) return
    try {
      setActionLoading(action)
      setActionMessage("")
      const result = await adminAnalysisService.updateReview(selected.requestId, action, adminMemo)
      applyReviewResult(result)
      setActionMessage(
        action === "needs_review"
          ? "검토 필요 상태로 표시했습니다."
          : action === "confirm"
            ? "정상 결과로 확인했습니다."
            : "관리자 메모를 저장했습니다.",
      )
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "요청을 처리하지 못했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  const reanalyze = async () => {
    if (!selected || !window.confirm("원본 리뷰로 다시 분석할까요? 새 분석 요청이 생성됩니다.")) return
    try {
      setActionLoading("reanalyze")
      setActionMessage("")
      const result = await adminAnalysisService.reanalyze(selected.requestId)
      setSelected(result)
      setAdminMemo(result.adminMemo ?? "")
      setActionMessage(`새 분석 요청 #${result.requestId}이 완료됐습니다.`)
      await loadData()
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : "재분석을 완료하지 못했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <AdminAppShell title="분석 결과 관리">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN ANALYSES</p>
          <h1>분석 결과 관리</h1>
          <p>실제 분석 요청과 결과 점수, 처리 상태를 확인하세요.</p>
        </section>

        <section className="soft-card admin-table-card admin-analysis-filter">
          <div className="admin-analysis-filter-heading"><div><span>FILTER</span><h2>분석 요청 찾기</h2></div><p>조건을 선택해 운영 데이터를 빠르게 확인하세요.</p></div>
          <div className="admin-filter-grid">
            <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="분석 ID, 병원, 사용자, 오류 메시지" />
            <select value={filters.category} onChange={(event) => updateFilters({ ...filters, category: event.target.value as AdminAnalysisFilters["category"] })}>
              <option value="all">전체 진료과</option>
              <option value="dermatology">피부과</option>
              <option value="ophthalmology">안과</option>
              <option value="dentistry">치과</option>
              <option value="orthopedics">정형외과</option>
            </select>
            <select value={filters.status} onChange={(event) => updateFilters({ ...filters, status: event.target.value as AdminAnalysisFilters["status"] })}>
              <option value="all">전체 상태</option>
              <option value="pending">대기</option>
              <option value="analyzing">분석 중</option>
              <option value="success">완료</option>
              <option value="failed">실패</option>
              <option value="canceled">취소</option>
            </select>
            <select value={filters.analysisType} onChange={(event) => updateFilters({ ...filters, analysisType: event.target.value as AdminAnalysisFilters["analysisType"] })}>
              <option value="all">전체 분석 방식</option>
              <option value="single_review">단일 리뷰</option>
              <option value="multi_review">다중 리뷰</option>
              <option value="place_only">장소 정보</option>
              <option value="full">전체 분석</option>
            </select>
          </div>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}
        {!isLoading && (
          <section className="soft-card admin-table-card admin-analysis-list-panel">
            <div className="admin-card-title-row"><h2>분석 요청 목록</h2><span>{total}건</span></div>
            <div className="admin-analysis-card-list">
              {items.map((item) => <article key={item.requestId} className="admin-analysis-item">
                <header><div><span>{categoryLabel(item.hospital?.category)}</span><h3>{item.hospital?.hospitalName ?? "병원 정보 없음"}</h3></div><span className={`admin-analysis-status status-${item.status}`}>{statusLabel(item.status)}</span></header>
                <dl>
                  <div><dt>분석 방식</dt><dd>{analysisTypeLabel(item.analysisType)}</dd></div>
                  <div><dt>리뷰</dt><dd>{item.reviewCount}개</dd></div>
                  <div><dt>신뢰 점수</dt><dd>{item.trustScore == null ? "-" : `${item.trustScore}점`}</dd></div>
                  <div><dt>처리 시각</dt><dd>{shortDate(item.createdAt)}</dd></div>
                </dl>
                <footer><span>요청 #{item.requestId} · {memberLabel(item)}</span><button type="button" onClick={() => openDetail(item)}>상세 조회</button></footer>
              </article>)}
              {items.length === 0 && <p className="admin-analysis-empty">조회된 분석 요청이 없습니다.</p>}
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            {total > 0 && (
              <div className="admin-analysis-page-size">
                <select
                  value={pageSize}
                  aria-label="페이지당 분석 요청 수"
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                    setPage(1)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}개씩 보기</option>)}
                </select>
                <span>{rangeStart}-{rangeEnd} / 총 {total}건</span>
              </div>
            )}
          </section>
        )}

        {selected && (
          <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
            <section className="admin-user-drawer admin-analysis-drawer" role="dialog" aria-modal="true">
              <button className="admin-drawer-close" onClick={() => setSelected(null)} aria-label="닫기"><X /></button>
              <header className="admin-analysis-drawer-heading"><span>ANALYSIS DETAIL</span><h2>분석 상세</h2><p>요청 #{selected.requestId} · {memberLabel(selected)}</p></header>
              <dl>
                {[
                  ["병원", selected.hospital?.hospitalName ?? "-"], ["진료과", selected.hospital?.category ?? "-"],
                  ["분석 방식", selected.analysisType], ["리뷰 수", String(selected.reviewCount)],
                  ["종합 점수", selected.totalScore == null ? "-" : `${selected.totalScore}점`],
                  ["리뷰 신뢰 점수", selected.trustScore == null ? "-" : `${selected.trustScore}점`],
                  ["광고성 위험 점수", selected.adScore == null ? "-" : `${selected.adScore}점`],
                  ["상태", selected.status], ["생성 시각", formatDate(selected.createdAt)],
                  ["처리 시간", selected.durationSeconds == null ? "-" : `${selected.durationSeconds}초`],
                  ["관리 검토", reviewStatusLabel(selected.reviewStatus)],
                  ["오류", selected.errorMessage ?? "-"],
                ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <div className="admin-analysis-memo">
                <label htmlFor="analysis-admin-memo">관리자 메모</label>
                <textarea
                  id="analysis-admin-memo"
                  value={adminMemo}
                  onChange={(event) => setAdminMemo(event.target.value)}
                  placeholder="검토 내용이나 후속 조치 메모를 남겨주세요."
                  maxLength={2000}
                />
              </div>
              {actionMessage && <p className="admin-analysis-action-message" role="status">{actionMessage}</p>}
              <div className="admin-drawer-actions">
                <button type="button" onClick={reanalyze} disabled={actionLoading !== null}>
                  {actionLoading === "reanalyze" ? "다시 분석 중…" : "다시 분석"}
                </button>
                <button type="button" onClick={() => updateReview("needs_review")} disabled={actionLoading !== null || selected.reviewStatus === "pending"}>
                  {actionLoading === "needs_review" ? "처리 중…" : "검토 필요 표시"}
                </button>
                <button type="button" onClick={() => updateReview("confirm")} disabled={actionLoading !== null || selected.reviewStatus === "resolved"}>
                  {actionLoading === "confirm" ? "처리 중…" : "정상 결과 확인"}
                </button>
                <button type="button" onClick={() => updateReview("memo")} disabled={actionLoading !== null}>
                  {actionLoading === "memo" ? "저장 중…" : "메모 저장"}
                </button>
              </div>
            </section>
          </div>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <div className="admin-pagination-controls" aria-label="분석 요청 페이지 이동"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>← 이전</button><span aria-current="page">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>다음 →</button></div>
}

function categoryLabel(value?: string | null) {
  return ({ dermatology: "피부과", ophthalmology: "안과", dentistry: "치과", orthopedics: "정형외과" } as Record<string, string>)[value ?? ""] ?? "진료과 미지정"
}
function statusLabel(value: string) {
  return ({ pending: "대기", analyzing: "분석 중", success: "완료", failed: "실패", canceled: "취소" } as Record<string, string>)[value] ?? value
}
function analysisTypeLabel(value: string) {
  return ({ single_review: "단일 리뷰", multi_review: "다중 리뷰", place_only: "장소 정보", full: "전체 분석" } as Record<string, string>)[value] ?? value
}
function reviewStatusLabel(value?: AdminAnalysisItem["reviewStatus"]) {
  return ({ pending: "검토 필요", reviewing: "검토 중", resolved: "정상 확인" } as Record<string, string>)[value ?? ""] ?? "미검토"
}
function shortDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
