import { apiClient } from "./apiClient"

export type AdminAnalysisStatus = "pending" | "analyzing" | "success" | "failed" | "canceled"
export type AdminAnalysisType = "single_review" | "multi_review" | "place_only" | "full"
export type AdminAnalysisCategory = "dermatology" | "ophthalmology" | "dentistry" | "orthopedics"

export type AdminAnalysisItem = {
  id: number
  requestId: number
  resultId?: number | null
  member?: { id: number; email?: string | null; nickname?: string | null } | null
  hospital?: {
    id: number
    hospitalName: string
    category: string
    region?: string | null
    address?: string | null
  } | null
  analysisType: AdminAnalysisType
  reviewCount: number
  status: AdminAnalysisStatus
  totalScore?: number | null
  trustScore?: number | null
  adScore?: number | null
  placeScore?: number | null
  foreignerScore?: number | null
  trustLevel?: string | null
  adSuspicion?: string | null
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
  durationSeconds?: number | null
}

export type AdminAnalysisFilters = {
  keyword?: string
  status?: "all" | AdminAnalysisStatus
  category?: "all" | AdminAnalysisCategory
  analysisType?: "all" | AdminAnalysisType
  page?: number
  perPage?: number
}

export type AdminPaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  perPage: number
}

function buildParams(filters: AdminAnalysisFilters) {
  const params = new URLSearchParams()
  if (filters.keyword?.trim()) params.set("q", filters.keyword.trim())
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.category && filters.category !== "all") params.set("category", filters.category)
  if (filters.analysisType && filters.analysisType !== "all") params.set("analysisType", filters.analysisType)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.perPage) params.set("per_page", String(filters.perPage))
  return params
}

async function getList(path: "/api/admin/analyses" | "/api/admin/errors", filters: AdminAnalysisFilters) {
  const params = buildParams(filters)
  // 오류 목록은 실패 상태를 서버가 강제하므로 status 쿼리를 보내지 않는다.
  if (path === "/api/admin/errors") params.delete("status")
  const query = params.toString()
  const result = await apiClient<AdminAnalysisItem[]>(`${path}${query ? `?${query}` : ""}`, { auth: true })
  return {
    items: result.data,
    total: result.meta?.count ?? result.data.length,
    page: result.meta?.page ?? filters.page ?? 1,
    perPage: result.meta?.per_page ?? filters.perPage ?? 20,
  } satisfies AdminPaginatedResult<AdminAnalysisItem>
}

export const adminAnalysisService = {
  getAnalyses(filters: AdminAnalysisFilters = {}) {
    return getList("/api/admin/analyses", filters)
  },
  getErrors(filters: Omit<AdminAnalysisFilters, "status"> = {}) {
    return getList("/api/admin/errors", filters)
  },
}
