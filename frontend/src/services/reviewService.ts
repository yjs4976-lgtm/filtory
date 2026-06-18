import { mockAnalysisResult } from "@/lib/mockData"
import { apiClient } from "./apiClient"

export async function analyzeReviews(payload) {
  try {
    return await apiClient("/reviews/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  } catch {
    return mockAnalysisResult
  }
}
