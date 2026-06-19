import type { AnalysisHistoryItem, HospitalCategory } from "@/lib/types"
import {
  deleteAnalysisHistoryItem,
  readAnalysisHistory,
  saveAnalysisHistoryItem,
} from "@/lib/analysisStorage"
import { getTrustLevelKey, type TrustLevelKey } from "@/lib/score"

export type AnalysisHistorySort = "latest" | "trust" | "ad"
export type TrustFilter = "all" | TrustLevelKey

export type AnalysisHistoryFilters = {
  keyword?: string
  category?: "all" | HospitalCategory
  trust?: TrustFilter
  sort?: AnalysisHistorySort
}

function matchesTrust(item: AnalysisHistoryItem, trust: TrustFilter) {
  const score = item.trustScore ?? item.score
  if (trust !== "all") return getTrustLevelKey(score) === trust
  return true
}

export const analysisHistoryService = {
  async getAnalysisHistory(filters: AnalysisHistoryFilters = {}) {
    // TODO: 실제 분석 기록 API가 준비되면 /api/member/analysis-history로 교체합니다.
    const keyword = filters.keyword?.trim().toLowerCase() ?? ""
    const category = filters.category ?? "all"
    const trust = filters.trust ?? "all"
    const sort = filters.sort ?? "latest"

    return readAnalysisHistory()
      .filter((item) => !keyword || item.hospitalName.toLowerCase().includes(keyword))
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => matchesTrust(item, trust))
      .sort((a, b) => {
        if (sort === "trust") return (b.trustScore ?? b.score) - (a.trustScore ?? a.score)
        if (sort === "ad") return (b.adSuspicionScore ?? 0) - (a.adSuspicionScore ?? 0)
        return String(b.analyzedAt ?? b.createdAt).localeCompare(String(a.analyzedAt ?? a.createdAt))
      })
  },

  async saveAnalysisHistoryItem(item: AnalysisHistoryItem) {
    return saveAnalysisHistoryItem(item)
  },

  async deleteAnalysisHistory(id: string) {
    // TODO: 실제 삭제 API 연결 시 DELETE /api/member/analysis-history/:id 호출로 교체합니다.
    deleteAnalysisHistoryItem(id)
    return { success: true, deletedId: id }
  },
}
