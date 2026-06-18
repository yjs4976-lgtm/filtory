import type { SavedHospital } from "@/lib/types"
import { mockSavedHospitals } from "./memberMockData"

export const savedHospitalService = {
  async getSavedHospitals(): Promise<SavedHospital[]> {
    // TODO: 실제 저장 병원 API가 준비되면 /api/member/saved-hospitals로 교체합니다.
    return mockSavedHospitals
  },

  async unsaveHospital(id: number) {
    // TODO: 실제 저장 해제 API 연결 시 DELETE /api/member/saved-hospitals/:id 호출로 교체합니다.
    return { success: true, deletedId: id }
  },

  async addToCompare(id: number) {
    // TODO: 실제 비교함 API가 생기면 POST /api/member/compare 호출로 교체합니다.
    return { success: true, id }
  },
}
