import { apiClient } from "./apiClient"
import type { AdminPaginatedResult } from "./adminAnalysisService"

export type AdminUsageType = "FREE_BASE" | "PLUS" | "REWARDED" | "ADMIN_GRANTED"

export type AdminUsageItem = {
  id: number
  member?: { id: number; email?: string | null; nickname?: string | null } | null
  analysisResultId: number
  hospital?: { id: number; hospitalName: string; category: string } | null
  usageType: AdminUsageType
  periodKey: string
  chargedAt?: string | null
  totalScore?: number | null
  trustScore?: number | null
  adScore?: number | null
}

export type AdminUsageFilters = {
  keyword?: string
  usageType?: "all" | AdminUsageType
  periodKey?: string
  page?: number
  perPage?: number
}

export const adminUsageService = {
  async getUsage(filters: AdminUsageFilters = {}) {
    const params = new URLSearchParams()
    if (filters.keyword?.trim()) params.set("q", filters.keyword.trim())
    if (filters.usageType && filters.usageType !== "all") params.set("usageType", filters.usageType)
    if (filters.periodKey?.trim()) params.set("periodKey", filters.periodKey.trim())
    if (filters.page) params.set("page", String(filters.page))
    if (filters.perPage) params.set("per_page", String(filters.perPage))

    const query = params.toString()
    const result = await apiClient<AdminUsageItem[]>(`/api/admin/usage${query ? `?${query}` : ""}`, { auth: true })
    return {
      items: result.data,
      total: result.meta?.count ?? result.data.length,
      page: result.meta?.page ?? filters.page ?? 1,
      perPage: result.meta?.per_page ?? filters.perPage ?? 20,
    } satisfies AdminPaginatedResult<AdminUsageItem>
  },
}
