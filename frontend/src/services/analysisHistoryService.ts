import type { AnalysisHistoryItem, HospitalCategory, User } from "@/lib/types"
import {
  deleteAnalysisHistoryItem,
  saveAnalysisHistoryItem,
} from "@/lib/analysisStorage"
import { getTrustLevelKey, type TrustLevelKey } from "@/lib/score"
import { apiClient } from "./apiClient"
import { getHistory } from "./historyService"

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
  async getAnalysisHistory(memberId: User["id"] | undefined, filters: AnalysisHistoryFilters = {}) {
    const keyword = filters.keyword?.trim().toLowerCase() ?? ""
    const category = filters.category ?? "all"
    const trust = filters.trust ?? "all"
    const sort = filters.sort ?? "latest"

    const history = await getHistory(memberId)

    return history
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

  async deleteAnalysisHistory(memberId: User["id"] | undefined, id: string) {
    const numericMemberId = Number(memberId)
    const numericRequestId = Number(id)
    if (Number.isInteger(numericMemberId) && numericMemberId > 0 && Number.isInteger(numericRequestId)) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/${numericRequestId}`, {
          method: "DELETE",
          auth: true,
        })
      } catch {
        // A locally created analysis has no server request to delete yet.
      }
    }
    deleteAnalysisHistoryItem(id)
    return { success: true, deletedId: id }
  },
}
