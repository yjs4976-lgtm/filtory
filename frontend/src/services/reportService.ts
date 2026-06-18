import type { MyReport } from "@/lib/types"
import { mockReports } from "./memberMockData"

export const reportService = {
  async getMyReports(): Promise<MyReport[]> {
    // TODO: 실제 신고 내역 API가 준비되면 /api/member/reports로 교체합니다.
    return mockReports
  },

  async cancelReport(id: number) {
    // TODO: 실제 신고 취소 API 연결 시 PATCH /api/member/reports/:id/cancel로 교체합니다.
    return { success: true, canceledId: id }
  },
}
