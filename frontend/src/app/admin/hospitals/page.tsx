"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import {
  adminHospitalService,
  type AdminHospital,
  type AdminHospitalCategory,
  type AdminHospitalFilters,
  type AdminHospitalStatus,
  type AdminHospitalUpdatePayload,
} from "@/services/adminHospitalService"

const CATEGORY_OPTIONS: AdminHospitalCategory[] = ["dermatology", "ophthalmology", "dentistry", "orthopedics"]
const STATUS_OPTIONS: AdminHospitalStatus[] = ["active", "needs_review", "hidden", "archived"]
const PAGE_SIZE_OPTIONS = [5, 10, 20] as const

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
}

export default function AdminHospitalsPage() {
  const { t, language } = useLanguage()
  const [filters, setFilters] = useState<AdminHospitalFilters>({ category: "all", status: "all" })
  const [hospitals, setHospitals] = useState<AdminHospital[]>([])
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
      const result = await adminHospitalService.getHospitals({ ...filters, page, perPage: pageSize })
      setHospitals(result.items)
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

  const handleSave = async (hospitalId: number, payload: AdminHospitalUpdatePayload) => {
    await adminHospitalService.updateHospital(hospitalId, payload)
    await loadData()
  }

  const updateFilters = (nextFilters: AdminHospitalFilters) => {
    setFilters(nextFilters)
    setPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, total)

  return (
    <AdminAppShell title={t.admin.hospitals}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN HOSPITALS</p>
          <h1>{t.admin.hospitalsTitle}</h1>
          <p>{t.admin.hospitalsDescription}</p>
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
              value={filters.category ?? "all"}
              onChange={(event) => updateFilters({ ...filters, category: event.target.value as AdminHospitalFilters["category"] })}
            >
              <option value="all">{labels.allCategories}</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {labels.category[category]}
                </option>
              ))}
            </select>
            <select
              value={filters.status ?? "all"}
              onChange={(event) => updateFilters({ ...filters, status: event.target.value as AdminHospitalFilters["status"] })}
            >
              <option value="all">{labels.allStatuses}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {labels.status[status]}
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
                    <th>{labels.nameColumn}</th>
                    <th>{labels.linksColumn}</th>
                    <th>{labels.statusColumn}</th>
                    <th>{labels.memoColumn}</th>
                    <th>{labels.updatedColumn}</th>
                    <th>{labels.actionColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((hospital) => (
                    <HospitalRow key={hospital.id} hospital={hospital} labels={labels} onSave={handleSave} />
                  ))}
                  {hospitals.length === 0 && (
                    <tr>
                      <td className="empty-cell" colSpan={6}>
                        {labels.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="admin-pagination-area" aria-label={labels.paginationLabel}>
                <div className="admin-pagination-controls">
                  <button
                    type="button"
                    className="admin-pagination-button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {labels.previousPage}
                  </button>
                  <span className="admin-pagination-info">{safePage} / {totalPages}</span>
                  <button
                    type="button"
                    className="admin-pagination-button admin-pagination-button-primary"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    {labels.nextPage}
                  </button>
                </div>
                <select
                  className="admin-page-size-select"
                  value={pageSize}
                  aria-label={labels.pageSizeLabel}
                  onChange={(event) => handlePageSizeChange(event.target.value)}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {labels.perPage.replace("{count}", String(option))}
                    </option>
                  ))}
                </select>
                <p className="admin-pagination-range">
                  {rangeStart}-{rangeEnd} / {total}{labels.countSuffix}
                </p>
              </div>
            )}
          </section>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}

function HospitalRow({
  hospital,
  labels,
  onSave,
}: {
  hospital: AdminHospital
  labels: typeof koLabels
  onSave: (hospitalId: number, payload: AdminHospitalUpdatePayload) => Promise<void>
}) {
  const [draft, setDraft] = useState({
    hospitalName: hospital.hospitalName,
    naverPlaceUrl: hospital.naverPlaceUrl ?? "",
    kakaoPlaceUrl: hospital.kakaoPlaceUrl ?? "",
    googleMapUrl: hospital.googleMapUrl ?? "",
    homepageUrl: hospital.homepageUrl ?? "",
    adminStatus: hospital.adminStatus,
    adminMemo: hospital.adminMemo ?? "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const save = async (markVerified = false) => {
    try {
      setIsSaving(true)
      await onSave(hospital.id, {
        hospitalName: draft.hospitalName,
        naverPlaceUrl: draft.naverPlaceUrl,
        kakaoPlaceUrl: draft.kakaoPlaceUrl,
        googleMapUrl: draft.googleMapUrl,
        homepageUrl: draft.homepageUrl,
        adminStatus: draft.adminStatus,
        adminMemo: draft.adminMemo,
        markVerified,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <tr>
      <td>
        <input
          value={draft.hospitalName}
          aria-label={labels.nameColumn}
          onChange={(event) => setDraft({ ...draft, hospitalName: event.target.value })}
        />
        <br />
        <span>
          {labels.category[hospital.category]} · {hospital.region ?? hospital.roadAddress ?? hospital.address ?? "-"}
        </span>
      </td>
      <td>
        <input
          value={draft.naverPlaceUrl}
          placeholder={labels.naverPlaceholder}
          aria-label={labels.naverPlaceholder}
          onChange={(event) => setDraft({ ...draft, naverPlaceUrl: event.target.value })}
        />
        <input
          value={draft.kakaoPlaceUrl}
          placeholder={labels.kakaoPlaceholder}
          aria-label={labels.kakaoPlaceholder}
          onChange={(event) => setDraft({ ...draft, kakaoPlaceUrl: event.target.value })}
        />
        <input
          value={draft.googleMapUrl}
          placeholder={labels.googlePlaceholder}
          aria-label={labels.googlePlaceholder}
          onChange={(event) => setDraft({ ...draft, googleMapUrl: event.target.value })}
        />
        <input
          value={draft.homepageUrl}
          placeholder={labels.homepagePlaceholder}
          aria-label={labels.homepagePlaceholder}
          onChange={(event) => setDraft({ ...draft, homepageUrl: event.target.value })}
        />
      </td>
      <td>
        <select
          className="admin-status-select"
          value={draft.adminStatus}
          onChange={(event) => setDraft({ ...draft, adminStatus: event.target.value as AdminHospitalStatus })}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {labels.status[status]}
            </option>
          ))}
        </select>
        <br />
        <span>{hospital.verifiedAt ? labels.verifiedAt.replace("{date}", formatDate(hospital.verifiedAt)) : labels.unverified}</span>
      </td>
      <td>
        <textarea
          rows={4}
          value={draft.adminMemo}
          placeholder={labels.memoPlaceholder}
          onChange={(event) => setDraft({ ...draft, adminMemo: event.target.value })}
        />
      </td>
      <td>{formatDate(hospital.updatedAt)}</td>
      <td>
        <button type="button" className="small-button" disabled={isSaving} onClick={() => save(false)}>
          {labels.save}
        </button>
        <button type="button" className="small-button" disabled={isSaving} onClick={() => save(true)}>
          {labels.verifyAndSave}
        </button>
      </td>
    </tr>
  )
}

const koLabels = {
  filterTitle: "병원 필터",
  searchPlaceholder: "병원명, 영문명, 주소, 링크 검색",
  allCategories: "전체 진료과",
  allStatuses: "전체 상태",
  listTitle: "병원 목록",
  countSuffix: "개",
  nameColumn: "병원명",
  linksColumn: "링크",
  statusColumn: "상태",
  memoColumn: "관리자 메모",
  updatedColumn: "수정일",
  actionColumn: "처리",
  naverPlaceholder: "네이버 플레이스 URL",
  kakaoPlaceholder: "카카오 장소 URL",
  googlePlaceholder: "Google 지도 URL",
  homepagePlaceholder: "홈페이지 URL",
  memoPlaceholder: "검증 메모",
  save: "저장",
  verifyAndSave: "검증 저장",
  unverified: "미검증",
  verifiedAt: "{date} 검증",
  empty: "검색된 병원이 없습니다.",
  paginationLabel: "병원 목록 페이지",
  previousPage: "이전",
  nextPage: "다음",
  pageSizeLabel: "페이지당 병원 수",
  perPage: "{count}개씩 보기",
  category: {
    dermatology: "피부과",
    ophthalmology: "안과",
    dentistry: "치과",
    orthopedics: "정형외과",
  },
  status: {
    active: "활성",
    needs_review: "검토 필요",
    hidden: "숨김",
    archived: "보관",
  },
}

const enLabels: typeof koLabels = {
  filterTitle: "Clinic filters",
  searchPlaceholder: "Search clinic name, English name, address, or links",
  allCategories: "All categories",
  allStatuses: "All statuses",
  listTitle: "Clinic list",
  countSuffix: " clinics",
  nameColumn: "Clinic name",
  linksColumn: "Links",
  statusColumn: "Status",
  memoColumn: "Admin memo",
  updatedColumn: "Updated",
  actionColumn: "Action",
  naverPlaceholder: "Naver Place URL",
  kakaoPlaceholder: "Kakao place URL",
  googlePlaceholder: "Google Maps URL",
  homepagePlaceholder: "Website URL",
  memoPlaceholder: "Verification memo",
  save: "Save",
  verifyAndSave: "Verify",
  unverified: "Unverified",
  verifiedAt: "Verified {date}",
  empty: "No clinics found.",
  paginationLabel: "Clinic list pages",
  previousPage: "Previous",
  nextPage: "Next",
  pageSizeLabel: "Clinics per page",
  perPage: "{count} per page",
  category: {
    dermatology: "Dermatology",
    ophthalmology: "Ophthalmology",
    dentistry: "Dental",
    orthopedics: "Orthopedics",
  },
  status: {
    active: "Active",
    needs_review: "Needs review",
    hidden: "Hidden",
    archived: "Archived",
  },
}
