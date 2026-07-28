import { apiClient } from "./apiClient"
import type { AdminPaginatedResult } from "./adminAnalysisService"

export type AdminAuditLog = {
  id: number
  adminId?: number | null
  admin?: { id: number; email?: string | null; nickname?: string | null } | null
  action: string
  resourceType?: string | null
  resourceId?: number | null
  targetMemberId?: number | null
  description?: string | null
  ipAddress?: string | null
  metadataSummary?: {
    before?: unknown
    after?: unknown
  } | null
  createdAt?: string | null
}

export type AdminAuditLogFilters = {
  keyword?: string
  action?: string
  resourceType?: string
  adminId?: string
  page?: number
  perPage?: number
}

export const adminAuditLogService = {
  async getAuditLogs(filters: AdminAuditLogFilters = {}) {
    const params = new URLSearchParams()
    if (filters.keyword?.trim()) params.set("q", filters.keyword.trim())
    if (filters.action?.trim()) params.set("action", filters.action.trim())
    if (filters.resourceType?.trim()) params.set("resourceType", filters.resourceType.trim())
    if (filters.adminId?.trim()) params.set("adminId", filters.adminId.trim())
    if (filters.page) params.set("page", String(filters.page))
    if (filters.perPage) params.set("per_page", String(filters.perPage))

    const query = params.toString()
    const result = await apiClient<AdminAuditLog[]>(`/api/admin/audit-logs${query ? `?${query}` : ""}`, {
      auth: true,
    })
    return {
      items: result.data,
      total: result.meta?.count ?? result.data.length,
      page: result.meta?.page ?? filters.page ?? 1,
      perPage: result.meta?.per_page ?? filters.perPage ?? 20,
    } satisfies AdminPaginatedResult<AdminAuditLog>
  },
}
