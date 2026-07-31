import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { apiClient } from "./apiClient"

export type AdminUserActivity = {
  memberId: number
  analysisHistory: Array<{
    requestId: number
    resultId: number | null
    hospitalName: string | null
    category: string | null
    totalScore: number | null
    trustScore: number | null
    adScore: number | null
    status: string
    createdAt: string | null
  }>
  savedHospitals: Array<{
    hospitalId: number
    analysisResultId: number | null
    hospitalName: string | null
    category: string | null
    savedAt: string | null
  }>
  reports: Array<{
    id: number
    type: string
    status: string
    hospitalName: string | null
    createdAt: string | null
  }>
  counts: {
    analyses: number
    savedHospitals: number
    reports: number
  }
}

export type AdminUserFilters = {
  keyword?: string
  status?: "all" | UserStatus
  role?: "all" | UserRole
}

export const adminUserService = {
  async getUsers(filters: AdminUserFilters = {}) {
    const params = new URLSearchParams()
    if (filters.keyword?.trim()) params.set("keyword", filters.keyword.trim())
    if (filters.status && filters.status !== "all") params.set("status", filters.status)
    if (filters.role && filters.role !== "all") params.set("role", filters.role)

    const query = params.toString()
    const result = await apiClient<AdminUser[]>(`/api/admin/users${query ? `?${query}` : ""}`, {
      auth: true,
    })
    return result.data
  },

  async getUserDetail(id: number) {
    const result = await apiClient<AdminUser>(`/api/admin/users/${id}`, { auth: true })
    return result.data
  },

  async getUserActivity(id: number) {
    const result = await apiClient<AdminUserActivity>(`/api/admin/users/${id}/activity`, { auth: true })
    return result.data
  },

  async updateUserStatus(id: number, status: UserStatus) {
    const result = await apiClient<AdminUser>(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    })
    return result.data
  },
}
