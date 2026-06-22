import type { CompareHospital, CompareResult, HospitalCategory, SavedHospital, User } from "@/lib/types"
import { savedHospitalService } from "./savedHospitalService"

export const compareService = {
  async getCompareHospitalsByCategory(category: HospitalCategory, memberId?: User["id"]) {
    const hospitals = await savedHospitalService.getSavedHospitals(memberId)
    return hospitals.filter((hospital) => hospital.category === category).map(toCompareHospital)
  },

  async compareHospitals(category: HospitalCategory, selectedIds: number[], memberId?: User["id"]): Promise<CompareResult> {
    // TODO: 실제 비교 분석 API가 준비되면 POST /api/member/compare/result로 교체합니다.
    const savedHospitals = await savedHospitalService.getSavedHospitals(memberId)
    const hospitals = savedHospitals
      .filter((hospital) => hospital.category === category && selectedIds.includes(hospital.id))
      .map(toCompareHospital)
    const recommended = hospitals.slice().sort((a, b) => b.trustScore - a.trustScore)[0]

    return {
      category,
      hospitals,
      recommendedHospitalId: recommended?.id,
      summary: recommended
        ? `${recommended.hospitalName}의 리뷰 신뢰도가 선택한 병원 중 가장 안정적이에요.`
        : "비교할 병원을 선택해주세요.",
    }
  },
}

function toCompareHospital(hospital: SavedHospital): CompareHospital {
  return {
    ...hospital,
    // 상세 비교 지표는 실제 비교 API가 제공하기 전까지 임의 값으로 채우지 않습니다.
    reviewCount: 0,
    recentReviewRatio: 0,
    negativeReviewRatio: 0,
  }
}
