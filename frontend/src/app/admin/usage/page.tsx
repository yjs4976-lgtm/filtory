"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import { adminUsageService, type AdminUsageFilters, type AdminUsageItem } from "@/services/adminUsageService"

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const
const CURRENT_DATE = new Date()
const CURRENT_YEAR = CURRENT_DATE.getFullYear()
const CURRENT_MONTH = String(CURRENT_DATE.getMonth() + 1).padStart(2, "0")
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => CURRENT_YEAR + 1 - index)

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR")
}

export default function AdminUsagePage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<AdminUsageFilters>({ usageType: "all", periodKey: "" })
  const [items, setItems] = useState<AdminUsageItem[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true); setError("")
      const result = await adminUsageService.getUsage({ ...filters, page, perPage: pageSize })
      setItems(result.items); setTotal(result.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed)
    } finally { setIsLoading(false) }
  }, [filters, page, pageSize, t.admin.loadFailed])

  useEffect(() => { const timer = window.setTimeout(loadData, 150); return () => window.clearTimeout(timer) }, [loadData])
  const updateFilters = (next: AdminUsageFilters) => { setFilters(next); setPage(1) }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)
  const [selectedYear = "", selectedMonth = ""] = (filters.periodKey ?? "").split("-")

  const updatePeriod = (year: string, month: string) => {
    updateFilters({
      ...filters,
      periodKey: year && month ? `${year}-${month}` : "",
    })
  }

  return <AdminAppShell title="분석 사용량"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN USAGE</p><h1>분석 사용량</h1><p>서버에 기록된 상세 분석 사용량과 차감 유형을 확인하세요.</p></section>
    <section className="soft-card admin-table-card admin-usage-filter">
      <div className="admin-usage-filter-heading"><div><span>USAGE FILTER</span><h2>사용 기록 찾기</h2></div><p>사용자와 차감 유형, 기간으로 기록을 확인하세요.</p></div>
      <div className="admin-filter-grid">
        <input value={filters.keyword ?? ""} onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })} placeholder="기록 ID, 사용자, 병원" />
        <select value={filters.usageType} onChange={(event) => updateFilters({ ...filters, usageType: event.target.value as AdminUsageFilters["usageType"] })}><option value="all">전체 사용 유형</option><option value="FREE_BASE">Free 기본</option><option value="PLUS">Plus 테스트</option><option value="REWARDED">광고 보상</option><option value="ADMIN_GRANTED">관리자 지급</option></select>
        <fieldset className="admin-month-picker">
          <legend>사용 기간</legend>
          <div>
            <select
              value={selectedYear}
              aria-label="사용 연도"
              onChange={(event) => updatePeriod(event.target.value, selectedMonth || CURRENT_MONTH)}
            >
              <option value="">전체 연도</option>
              {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}년</option>)}
            </select>
            <select
              value={selectedMonth}
              aria-label="사용 월"
              onChange={(event) => updatePeriod(selectedYear || String(CURRENT_YEAR), event.target.value)}
            >
              <option value="">전체 월</option>
              {Array.from({ length: 12 }, (_, index) => {
                const month = String(index + 1).padStart(2, "0")
                return <option key={month} value={month}>{index + 1}월</option>
              })}
            </select>
          </div>
          <div className="admin-month-picker-actions">
            <button type="button" onClick={() => updatePeriod(String(CURRENT_YEAR), CURRENT_MONTH)}>이번 달</button>
            <button type="button" disabled={!filters.periodKey} onClick={() => updatePeriod("", "")}>초기화</button>
          </div>
        </fieldset>
      </div>
    </section>
    {isLoading && <p>{t.admin.loading}</p>}{error && <p className="form-error">{error}</p>}
    {!isLoading && <section className="soft-card admin-table-card admin-usage-list-panel">
      <div className="admin-card-title-row"><div><span>USAGE LOG</span><h2>사용량 기록</h2></div><strong>{total}건</strong></div>
      <div className="admin-usage-card-list">
        {items.map((item) => <article key={item.id} className="admin-usage-item">
          <header><div><span>기록 #{item.id} · 결과 #{item.analysisResultId}</span><h3>{item.hospital?.hospitalName ?? "병원 정보 없음"}</h3><small>{categoryLabel(item.hospital?.category)}</small></div><strong className={`usage-${item.usageType.toLowerCase()}`}>{usageTypeLabel(item.usageType)}</strong></header>
          <dl>
            <div><dt>사용자</dt><dd>{item.member?.nickname || item.member?.email || "-"}</dd></div>
            <div><dt>사용 기간</dt><dd>{item.periodKey}</dd></div>
            <div><dt>차감 시각</dt><dd>{formatDate(item.chargedAt)}</dd></div>
            <div><dt>신뢰 점수</dt><dd>{item.trustScore == null ? "-" : `${item.trustScore}점`}</dd></div>
          </dl>
        </article>)}
        {items.length === 0 && <p className="admin-usage-empty">조회된 사용량 로그가 없습니다.</p>}
      </div>
      {total > 0 && <>
        <div className="admin-pagination-controls" aria-label="분석 사용량 페이지 이동"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← 이전</button><span aria-current="page">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>다음 →</button></div>
        <div className="admin-analysis-page-size">
          <select value={pageSize} aria-label="페이지당 사용량 기록 수" onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]); setPage(1) }}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}개씩 보기</option>)}
          </select>
          <span>{rangeStart}-{rangeEnd} / 총 {total}건</span>
        </div>
      </>}
    </section>}
  </AdminGuard></AdminAppShell>
}

function categoryLabel(value?: string | null) {
  return ({ dermatology: "피부과", ophthalmology: "안과", dentistry: "치과", orthopedics: "정형외과" } as Record<string, string>)[value ?? ""] ?? "진료과 미지정"
}

function usageTypeLabel(value: AdminUsageItem["usageType"]) {
  return ({ FREE_BASE: "Free 기본", PLUS: "Plus 테스트", REWARDED: "광고 보상", ADMIN_GRANTED: "관리자 지급" } as Record<AdminUsageItem["usageType"], string>)[value]
}
