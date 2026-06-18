import type { CompareResult, HospitalCategory } from "@/lib/types"
import { categoryLabels, mockCompareHospitals } from "./memberMockData"

export const compareService = {
  async getCompareHospitalsByCategory(category: HospitalCategory) {
    // TODO: 실제 비교 후보 API가 준비되면 /api/member/compare?category=...로 교체합니다.
    return mockCompareHospitals.filter((hospital) => hospital.category === category)
  },

  async compareHospitals(category: HospitalCategory, selectedIds: number[]): Promise<CompareResult> {
    // TODO: 실제 비교 분석 API가 준비되면 POST /api/member/compare/result로 교체합니다.
    const hospitals = mockCompareHospitals.filter(
      (hospital) => hospital.category === category && selectedIds.includes(hospital.id)
    )
    const recommended = hospitals.slice().sort((a, b) => b.trustScore - a.trustScore)[0]

    return {
      category,
      hospitals,
      recommendedHospitalId: recommended?.id,
      summary: `${categoryLabels[category]}끼리 비교한 결과, ${recommended?.hospitalName ?? "선택한 병원"}의 리뷰 신뢰도가 가장 안정적이에요.`,
    }
  },
}
