"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import {
  adminReviewService,
  type AdminReviewCase,
  type AdminReviewCaseType,
  type AdminReviewFilters,
  type AdminReviewStatus,
} from "@/services/adminReviewService"

const STATUS_OPTIONS: AdminReviewStatus[] = ["pending", "reviewing", "resolved"]
const CASE_TYPE_OPTIONS: AdminReviewCaseType[] = [
  "ad_suspicion",
  "repetition_pattern",
  "inappropriate_content",
  "user_report",
  "wrong_hospital_info",
  "manual_review",
  "other",
]
const PAGE_SIZE_OPTIONS = [5, 10, 20] as const

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
}

function shortText(value?: string | null, fallback = "-") {
  if (!value) return fallback
  return value.length > 90 ? `${value.slice(0, 90)}...` : value
}

export default function AdminReviewsPage() {
  const { t, language } = useLanguage()
  const [filters, setFilters] = useState<AdminReviewFilters>({ status: "all", caseType: "all" })
  const [reviewCases, setReviewCases] = useState<AdminReviewCase[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const labels = language === "en" ? enLabels : koLabels

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await adminReviewService.getReviewCases({ ...filters, page, perPage: pageSize })
      setReviewCases(result.items)
      setTotal(result.total)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, pageSize, t.admin.loadFailed])

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const handleStatusChange = async (caseId: number, status: AdminReviewStatus, adminMemo?: string) => {
    await adminReviewService.updateStatus(caseId, status, adminMemo)
    await loadData()
  }

  const updateFilters = (nextFilters: AdminReviewFilters) => {
    setFilters(nextFilters)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <AdminAppShell title={t.admin.reviews}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN QUALITY</p>
          <h1>{t.admin.reviewsTitle}</h1>
          <p>{t.admin.reviewsDescription}</p>
        </section>

        <section className="soft-card admin-table-card admin-review-filter">
          <h2>{labels.filterTitle}</h2>
          <div className="admin-filter-grid">
            <input
              value={filters.keyword ?? ""}
              placeholder={labels.searchPlaceholder}
              onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })}
            />
            <select
              value={filters.status ?? "all"}
              onChange={(event) => updateFilters({ ...filters, status: event.target.value as AdminReviewFilters["status"] })}
            >
              <option value="all">{labels.allStatuses}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {labels.status[status]}
                </option>
              ))}
            </select>
            <select
              value={filters.caseType ?? "all"}
              onChange={(event) => updateFilters({ ...filters, caseType: event.target.value as AdminReviewFilters["caseType"] })}
            >
              <option value="all">{labels.allTypes}</option>
              {CASE_TYPE_OPTIONS.map((caseType) => (
                <option key={caseType} value={caseType}>
                  {labels.caseType[caseType]}
                </option>
              ))}
            </select>
          </div>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}

        {!isLoading && (
          <section className="soft-card admin-table-card admin-review-panel">
            <div className="admin-card-title-row">
              <h2>{labels.listTitle}</h2>
              <span>{total}{labels.countSuffix}</span>
            </div>

            <div className="admin-review-list">
              {reviewCases.map((reviewCase) => (
                <ReviewCaseCard
                  key={reviewCase.id}
                  reviewCase={reviewCase}
                  labels={labels}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {reviewCases.length === 0 && <p className="admin-review-empty">{labels.empty}</p>}
            </div>

            {total > 0 && (
              <div className="admin-pagination-area" aria-label={labels.paginationLabel}>
                <div className="admin-pagination-controls">
                  <button
                    type="button"
                    className="admin-pagination-button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {labels.previousPage}
                  </button>
                  <span className="admin-pagination-info">{page} / {totalPages}</span>
                  <button
                    type="button"
                    className="admin-pagination-button admin-pagination-button-primary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    {labels.nextPage}
                  </button>
                </div>
                <select
                  className="admin-page-size-select"
                  value={pageSize}
                  aria-label={labels.pageSizeLabel}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                    setPage(1)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{labels.perPage.replace("{count}", String(option))}</option>)}
                </select>
                <p className="admin-pagination-range">{rangeStart}-{rangeEnd} / {total}{labels.countSuffix}</p>
              </div>
            )}
          </section>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}

function ReviewCaseCard({
  reviewCase,
  labels,
  onStatusChange,
}: {
  reviewCase: AdminReviewCase
  labels: typeof koLabels
  onStatusChange: (caseId: number, status: AdminReviewStatus, adminMemo?: string) => Promise<void>
}) {
  const [memo, setMemo] = useState(reviewCase.adminMemo ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const saveStatus = async (status: AdminReviewStatus) => {
    try {
      setIsSaving(true)
      await onStatusChange(reviewCase.id, status, memo)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className="admin-review-card">
      <header>
        <div>
          <span>{labels.caseType[reviewCase.caseType] ?? reviewCase.caseType}</span>
          <strong>{reviewCase.hospital?.hospitalName ?? labels.noHospital}</strong>
          <small>{reviewCase.hospital?.region ?? reviewCase.hospital?.address ?? formatDate(reviewCase.createdAt)}</small>
        </div>
        <span className={`admin-review-status status-${reviewCase.status}`}>{labels.status[reviewCase.status]}</span>
      </header>
      <section className="admin-review-evidence">
        <span>{labels.reviewColumn}</span>
        <p>{shortText(reviewCase.review?.content ?? reviewCase.reviewReport?.reportReason ?? reviewCase.reason, labels.noEvidence)}</p>
      </section>
      <div className="admin-review-score-grid">
        <div><span>{labels.totalScore}</span><strong>{reviewCase.analysisResult?.totalScore ?? "-"}</strong></div>
        <div><span>{labels.trustScore}</span><strong>{reviewCase.analysisResult?.trustScore ?? "-"}</strong></div>
        <div><span>{labels.adScore}</span><strong>{reviewCase.analysisResult?.adScore ?? "-"}</strong></div>
        <div><span>{labels.signal}</span><strong>{reviewCase.analysisResult?.adSuspicion ?? reviewCase.analysisResult?.repetitionSuspicion ?? "-"}</strong></div>
      </div>
      <div className="admin-review-controls">
        <label>
          <span>{labels.statusColumn}</span>
        <select
          className="admin-status-select"
          value={reviewCase.status}
          disabled={isSaving}
          onChange={(event) => saveStatus(event.target.value as AdminReviewStatus)}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {labels.status[status]}
            </option>
          ))}
        </select>
        </label>
        <label>
          <span>{labels.memoColumn}</span>
        <textarea
          rows={3}
          value={memo}
          placeholder={labels.memoPlaceholder}
          onChange={(event) => setMemo(event.target.value)}
        />
        </label>
      </div>
      <footer>
        <span>#{reviewCase.id} · {formatDate(reviewCase.createdAt)}</span>
        <button type="button" className="small-button" disabled={isSaving} onClick={() => saveStatus(reviewCase.status)}>
          {isSaving ? labels.saving : labels.save}
        </button>
      </footer>
    </article>
  )
}

const koLabels = {
  filterTitle: "품질 확인 필터",
  searchPlaceholder: "병원명, 분석 근거, 사용자 피드백 검색",
  allStatuses: "전체 상태",
  allTypes: "전체 유형",
  listTitle: "품질 확인 큐",
  countSuffix: "건",
  caseColumn: "유형",
  hospitalColumn: "병원",
  reviewColumn: "분석 근거/피드백",
  scoreColumn: "점수",
  statusColumn: "상태",
  memoColumn: "관리자 메모",
  memoPlaceholder: "처리 메모",
  save: "저장",
  saving: "저장 중…",
  noHospital: "병원 정보 없음",
  noEvidence: "표시할 분석 근거가 없습니다.",
  totalScore: "종합 점수",
  trustScore: "신뢰 점수",
  adScore: "광고 위험",
  signal: "감지 신호",
  empty: "확인할 분석 품질 항목이 없습니다.",
  paginationLabel: "품질 확인 큐 페이지",
  previousPage: "이전",
  nextPage: "다음",
  pageSizeLabel: "페이지당 품질 항목 수",
  perPage: "{count}개씩 보기",
  status: {
    pending: "확인 필요",
    reviewing: "검토 중",
    resolved: "처리 완료",
  },
  caseType: {
    ad_suspicion: "광고 의심 신호",
    repetition_pattern: "반복 패턴 신호",
    inappropriate_content: "부적절한 분석 근거",
    user_report: "사용자 피드백",
    wrong_hospital_info: "병원 정보 오류",
    manual_review: "수동 품질 확인",
    other: "기타",
  },
}

const enLabels: typeof koLabels = {
  filterTitle: "Quality filters",
  searchPlaceholder: "Search clinic, analysis evidence, or user feedback",
  allStatuses: "All statuses",
  allTypes: "All types",
  listTitle: "Quality check queue",
  countSuffix: " cases",
  caseColumn: "Type",
  hospitalColumn: "Clinic",
  reviewColumn: "Evidence / feedback",
  scoreColumn: "Score",
  statusColumn: "Status",
  memoColumn: "Admin memo",
  memoPlaceholder: "Processing memo",
  save: "Save",
  saving: "Saving…",
  noHospital: "No clinic information",
  noEvidence: "No analysis evidence available.",
  totalScore: "Total score",
  trustScore: "Trust score",
  adScore: "Ad risk",
  signal: "Detected signal",
  empty: "No analysis quality items need review.",
  paginationLabel: "Quality queue pages",
  previousPage: "Previous",
  nextPage: "Next",
  pageSizeLabel: "Quality items per page",
  perPage: "{count} per page",
  status: {
    pending: "Needs check",
    reviewing: "Reviewing",
    resolved: "Done",
  },
  caseType: {
    ad_suspicion: "Ad suspicion signal",
    repetition_pattern: "Repeated pattern signal",
    inappropriate_content: "Inappropriate evidence",
    user_report: "User feedback",
    wrong_hospital_info: "Wrong clinic info",
    manual_review: "Manual quality check",
    other: "Other",
  },
}
