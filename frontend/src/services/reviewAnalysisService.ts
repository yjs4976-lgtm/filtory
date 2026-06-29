import { AI_API_BASE_URL } from "@/lib/constants"
import type { ReviewAnalyzeRequest, ReviewAnalyzeResponse } from "@/lib/types"

const ANALYZE_ERROR_MESSAGE = "분석 중 오류가 발생했어요. 다시 시도해주세요."

function buildAiApiUrl(path: string) {
  return `${AI_API_BASE_URL.replace(/\/$/, "")}${path}`
}

export const reviewAnalysisService = {
  async analyzeReview(payload: ReviewAnalyzeRequest): Promise<ReviewAnalyzeResponse> {
    const response = await fetch(buildAiApiUrl("/api/reviews/analyze"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result) {
      throw new Error(ANALYZE_ERROR_MESSAGE)
    }

    return result as ReviewAnalyzeResponse
  },
}
