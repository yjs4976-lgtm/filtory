import { apiClient } from "./apiClient"

export type AdminReviewStatus = "pending" | "reviewing" | "resolved"
export type AdminReviewCaseType =
  | "ad_suspicion"
  | "repetition_pattern"
  | "inappropriate_content"
  | "user_report"
  | "wrong_hospital_info"
  | "manual_review"
  | "other"

export type AdminReviewCase = {
  id: number
  caseType: AdminReviewCaseType
  status: AdminReviewStatus
  priority: "low" | "normal" | "high" | "urgent"
  reason?: string | null
  adminMemo?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  hospital?: {
    id: number
    hospitalName: string
    category: string
    region?: string | null
    address?: string | null
  } | null
  review?: {
    id: number
    content: string
    language?: string | null
    sourcePlatform?: string | null
    createdAt?: string | null
  } | null
  analysisResult?: {
    id: number
    totalScore?: number | null
    trustScore?: number | null
    adScore?: number | null
    adSuspicion?: string | null
    repetitionSuspicion?: string | null
    createdAt?: string | null
  } | null
  reviewReport?: {
    id: number
    reportType: string
    reportReason?: string | null
    status: string
    createdAt?: string | null
  } | null
}

export type AdminReviewFilters = {
  keyword?: string
  status?: "all" | AdminReviewStatus
  caseType?: "all" | AdminReviewCaseType
  page?: number
  perPage?: number
}

export type AdminPaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  perPage: number
}

export const adminReviewService = {
  async getReviewCases(filters: AdminReviewFilters = {}) {
    const params = new URLSearchParams()
    if (filters.keyword?.trim()) params.set("keyword", filters.keyword.trim())
    if (filters.status && filters.status !== "all") params.set("status", filters.status)
    if (filters.caseType && filters.caseType !== "all") params.set("caseType", filters.caseType)
    if (filters.page) params.set("page", String(filters.page))
    if (filters.perPage) params.set("per_page", String(filters.perPage))

    const query = params.toString()
    const result = await apiClient<AdminReviewCase[]>(`/api/admin/reviews${query ? `?${query}` : ""}`, {
      auth: true,
    })
    return {
      items: result.data,
      total: result.meta?.count ?? result.data.length,
      page: result.meta?.page ?? filters.page ?? 1,
      perPage: result.meta?.per_page ?? filters.perPage ?? 20,
    } satisfies AdminPaginatedResult<AdminReviewCase>
  },

  async updateStatus(id: number, status: AdminReviewStatus, adminMemo?: string) {
    const result = await apiClient<AdminReviewCase>(`/api/admin/reviews/${id}/status`, {
      method: "PATCH",
      auth: true,
      body: { status, adminMemo },
    })
    return result.data
  },
}
