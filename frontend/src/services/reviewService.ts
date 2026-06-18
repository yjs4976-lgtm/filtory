import { mockAnalysisResult } from "@/lib/mockData"
import { USE_MOCK } from "@/lib/constants"
import { apiClient } from "./apiClient"

export async function analyzeReviews(payload) {
  try {
    return await apiClient("/reviews/analyze", {
      method: "POST",
      body: payload,
    })
  } catch {
    if (!USE_MOCK) {
      throw new Error("리뷰 분석에 실패했습니다.")
    }

    return mockAnalysisResult
  }
}
