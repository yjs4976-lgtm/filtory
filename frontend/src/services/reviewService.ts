import { mockAnalysisResult } from "@/lib/mockData"
import { USE_MOCK } from "@/lib/constants"
import type { ReviewAnalyzeRequest } from "@/lib/types"
import { reviewAnalysisService } from "./reviewAnalysisService"

export async function analyzeReviews(payload: ReviewAnalyzeRequest) {
  try {
    return await reviewAnalysisService.analyzeReview(payload)
  } catch {
    if (!USE_MOCK) {
      throw new Error("리뷰 분석에 실패했습니다.")
    }

    return mockAnalysisResult
  }
}
