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
const PAGE_SIZE = 20

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
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const labels = language === "en" ? enLabels : koLabels

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await adminReviewService.getReviewCases({ ...filters, page, perPage: PAGE_SIZE })
      setReviewCases(result.items)
      setTotal(result.total)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, t.admin.loadFailed])

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AdminAppShell title={t.admin.reviews}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN QUALITY</p>
          <h1>{t.admin.reviewsTitle}</h1>
          <p>{t.admin.reviewsDescription}</p>
        </section>

        <section className="soft-card admin-table-card">
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
          <section className="soft-card admin-table-card">
            <div className="admin-card-title-row">
              <h2>{labels.listTitle}</h2>
              <span>{total}{labels.countSuffix}</span>
            </div>

            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{labels.caseColumn}</th>
                    <th>{labels.hospitalColumn}</th>
                    <th>{labels.reviewColumn}</th>
                    <th>{labels.scoreColumn}</th>
                    <th>{labels.statusColumn}</th>
                    <th>{labels.memoColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewCases.map((reviewCase) => (
                    <ReviewCaseRow
                      key={reviewCase.id}
                      reviewCase={reviewCase}
                      labels={labels}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                  {reviewCases.length === 0 && (
                    <tr>
                      <td className="empty-cell" colSpan={6}>
                        {labels.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
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
              </div>
            )}
          </section>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}

function ReviewCaseRow({
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
    <tr>
      <td>
        <strong>{labels.caseType[reviewCase.caseType] ?? reviewCase.caseType}</strong>
        <br />
        <span>{formatDate(reviewCase.createdAt)}</span>
      </td>
      <td>
        <strong>{reviewCase.hospital?.hospitalName ?? "-"}</strong>
        <br />
        <span>{reviewCase.hospital?.region ?? reviewCase.hospital?.address ?? "-"}</span>
      </td>
      <td>{shortText(reviewCase.review?.content ?? reviewCase.reviewReport?.reportReason ?? reviewCase.reason)}</td>
      <td>
        {reviewCase.analysisResult?.totalScore ?? "-"}
        <br />
        <span>{reviewCase.analysisResult?.adSuspicion ?? reviewCase.analysisResult?.repetitionSuspicion ?? "-"}</span>
      </td>
      <td>
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
      </td>
      <td>
        <textarea
          rows={2}
          value={memo}
          placeholder={labels.memoPlaceholder}
          onChange={(event) => setMemo(event.target.value)}
        />
        <button type="button" className="small-button" disabled={isSaving} onClick={() => saveStatus(reviewCase.status)}>
          {labels.save}
        </button>
      </td>
    </tr>
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
  empty: "확인할 분석 품질 항목이 없습니다.",
  paginationLabel: "품질 확인 큐 페이지",
  previousPage: "이전",
  nextPage: "다음",
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
  empty: "No analysis quality items need review.",
  paginationLabel: "Quality queue pages",
  previousPage: "Previous",
  nextPage: "Next",
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
