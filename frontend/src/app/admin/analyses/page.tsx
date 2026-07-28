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

const PAGE_SIZE = 20

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
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await adminAnalysisService.getAnalyses({ ...filters, page, perPage: PAGE_SIZE })
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

  const updateFilters = (next: AdminAnalysisFilters) => {
    setFilters(next)
    setPage(1)
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AdminAppShell title="분석 결과 관리">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN ANALYSES</p>
          <h1>분석 결과 관리</h1>
          <p>실제 분석 요청과 결과 점수, 처리 상태를 확인하세요.</p>
        </section>

        <section className="soft-card admin-table-card">
          <div className="admin-filter-grid">
            <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="분석 ID, 병원, 사용자, 오류 메시지" />
            <select value={filters.category} onChange={(event) => updateFilters({ ...filters, category: event.target.value as AdminAnalysisFilters["category"] })}>
              <option value="all">전체 진료과</option>
              <option value="dermatology">피부과</option>
              <option value="ophthalmology">안과</option>
              <option value="dentistry">치과</option>
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
          <section className="soft-card admin-table-card">
            <div className="admin-card-title-row"><h2>분석 요청 목록</h2><span>{total}건</span></div>
            <div className="table-scroll">
              <table className="admin-table">
                <thead><tr>{["요청 ID", "사용자", "병원·진료과", "분석 방식", "리뷰", "신뢰 점수", "상태", "관리"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.requestId}>
                      <td>{item.requestId}</td><td>{memberLabel(item)}</td>
                      <td>{item.hospital?.hospitalName ?? "-"}<br /><small>{item.hospital?.category ?? "-"}</small></td>
                      <td>{item.analysisType}</td><td>{item.reviewCount}</td><td>{item.trustScore ?? "-"}</td><td>{item.status}</td>
                      <td><button className="small-button" onClick={() => setSelected(item)}>조회</button></td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td className="empty-cell" colSpan={8}>조회된 분석 요청이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </section>
        )}

        {selected && (
          <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
            <section className="admin-user-drawer" role="dialog" aria-modal="true">
              <button className="admin-drawer-close" onClick={() => setSelected(null)} aria-label="닫기"><X /></button>
              <h2>분석 상세</h2><p>요청 {selected.requestId} · {memberLabel(selected)}</p>
              <dl>
                {[
                  ["병원", selected.hospital?.hospitalName ?? "-"], ["진료과", selected.hospital?.category ?? "-"],
                  ["분석 방식", selected.analysisType], ["리뷰 수", String(selected.reviewCount)],
                  ["종합 점수", selected.totalScore == null ? "-" : `${selected.totalScore}점`],
                  ["리뷰 신뢰 점수", selected.trustScore == null ? "-" : `${selected.trustScore}점`],
                  ["광고성 위험 점수", selected.adScore == null ? "-" : `${selected.adScore}점`],
                  ["상태", selected.status], ["생성 시각", formatDate(selected.createdAt)],
                  ["처리 시간", selected.durationSeconds == null ? "-" : `${selected.durationSeconds}초`],
                  ["오류", selected.errorMessage ?? "-"],
                ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <div className="admin-drawer-actions">{["다시 분석", "검토 필요 표시", "정상 결과 확인", "메모 저장"].map((label) => <button key={label} disabled title="저장 API 연결이 필요한 기능입니다">{label} · API 연결 필요</button>)}</div>
            </section>
          </div>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <div className="admin-pagination-controls"><button disabled={page <= 1} onClick={() => onPage(page - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>다음</button></div>
}
