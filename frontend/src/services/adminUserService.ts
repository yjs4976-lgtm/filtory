import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { apiClient } from "./apiClient"
import { mockAnalysisHistory, mockReports, mockSavedHospitals } from "./memberMockData"

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
    // TODO: 실제 회원별 활동 API가 준비되면 /api/admin/users/:id/activity로 교체합니다.
    return {
      userId: id,
      analysisHistory: mockAnalysisHistory,
      savedHospitals: mockSavedHospitals,
      reports: mockReports,
    }
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
