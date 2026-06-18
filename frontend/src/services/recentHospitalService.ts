import type { RecentViewedHospital } from "@/lib/types"
import { mockRecentViewedHospitals } from "./memberMockData"

export const recentHospitalService = {
  async getRecentViewedHospitals(): Promise<RecentViewedHospital[]> {
    // TODO: 실제 최근 본 병원 API가 준비되면 /api/member/recent-hospitals로 교체합니다.
    return mockRecentViewedHospitals
  },

  async deleteRecentHospital(id: number) {
    // TODO: 실제 최근 본 기록 삭제 API 연결 시 DELETE /api/member/recent-hospitals/:id 호출로 교체합니다.
    return { success: true, deletedId: id }
  },

  async clearRecentHospitals() {
    // TODO: 실제 전체 삭제 API 연결 시 DELETE /api/member/recent-hospitals 호출로 교체합니다.
    return { success: true }
  },
}
