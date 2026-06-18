import type { UserRole, UserStatus } from "@/lib/types"
import { mockAdminUsers, mockAnalysisHistory, mockReports, mockSavedHospitals } from "./memberMockData"

export type AdminUserFilters = {
  keyword?: string
  status?: "all" | UserStatus
  role?: "all" | UserRole
}

export const adminUserService = {
  async getUsers(filters: AdminUserFilters = {}) {
    // TODO: 실제 관리자 회원 API가 준비되면 /api/admin/users 쿼리로 교체합니다.
    const keyword = filters.keyword?.trim().toLowerCase() ?? ""
    return mockAdminUsers
      .filter((user) => {
        if (!keyword) return true
        return [user.name, user.nickname, user.email].some((value) => value?.toLowerCase().includes(keyword))
      })
      .filter((user) => !filters.status || filters.status === "all" || user.status === filters.status)
      .filter((user) => !filters.role || filters.role === "all" || user.role === filters.role)
  },

  async getUserDetail(id: number) {
    // TODO: 실제 관리자 회원 상세 API가 준비되면 /api/admin/users/:id로 교체합니다.
    return mockAdminUsers.find((user) => user.id === id) ?? mockAdminUsers[0]
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
    // TODO: 실제 상태 변경 API 연결 시 PATCH /api/admin/users/:id/status 호출로 교체합니다.
    return { success: true, id, status }
  },

  async saveMemo(id: number, memo: string) {
    // TODO: 실제 관리자 메모 API 연결 시 PATCH /api/admin/users/:id/memo 호출로 교체합니다.
    return { success: true, id, memo }
  },
}
