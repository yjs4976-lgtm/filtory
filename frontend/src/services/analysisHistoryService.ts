import type { AnalysisHistoryItem, HospitalCategory, User } from "@/lib/types"
import {
  emptyAnalysisHistoryTrash,
  moveAnalysisHistoryItemsToTrash,
  permanentlyDeleteAnalysisHistoryItems,
  restoreAnalysisHistoryItems,
  saveAnalysisHistoryItem,
} from "@/lib/analysisStorage"
import { getTrustLevelKey, type TrustLevelKey } from "@/lib/score"
import { apiClient } from "./apiClient"
import { getHistory, getTrashHistory } from "./historyService"

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

function toNumericMemberId(memberId: User["id"] | undefined) {
  const numericMemberId = Number(memberId)
  return Number.isInteger(numericMemberId) && numericMemberId > 0 ? numericMemberId : null
}

function filterAndSortHistory(items: AnalysisHistoryItem[], filters: AnalysisHistoryFilters = {}) {
  const keyword = filters.keyword?.trim().toLowerCase() ?? ""
  const category = filters.category ?? "all"
  const trust = filters.trust ?? "all"
  const sort = filters.sort ?? "latest"

  return items
    .filter((item) => !keyword || item.hospitalName.toLowerCase().includes(keyword))
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => matchesTrust(item, trust))
    .sort((a, b) => {
      if (sort === "trust") return (b.trustScore ?? b.score) - (a.trustScore ?? a.score)
      if (sort === "ad") return (b.adSuspicionScore ?? 0) - (a.adSuspicionScore ?? 0)
      return String(b.analyzedAt ?? b.createdAt).localeCompare(String(a.analyzedAt ?? a.createdAt))
    })
}

export const analysisHistoryService = {
  async getAnalysisHistory(memberId: User["id"] | undefined, filters: AnalysisHistoryFilters = {}) {
    const history = await getHistory(memberId)
    return filterAndSortHistory(history, filters)
  },

  async getAnalysisHistoryTrash(memberId: User["id"] | undefined, filters: AnalysisHistoryFilters = {}) {
    const history = await getTrashHistory(memberId)
    return filterAndSortHistory(history, filters)
  },

  async saveAnalysisHistoryItem(item: AnalysisHistoryItem) {
    return saveAnalysisHistoryItem(item)
  },

  async deleteAnalysisHistory(memberId: User["id"] | undefined, id: string) {
    return analysisHistoryService.moveAnalysisHistoryToTrash(memberId, [id])
  },

  async moveAnalysisHistoryToTrash(memberId: User["id"] | undefined, ids: string[]) {
    const numericMemberId = toNumericMemberId(memberId)
    const numericIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    if (numericMemberId && numericIds.length > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/trash`, {
          method: "PATCH",
          auth: true,
          body: { ids: numericIds },
        })
      } catch {
        // Local-only analysis records are still handled below.
      }
    }

    moveAnalysisHistoryItemsToTrash(ids, memberId)
    return { success: true, ids }
  },

  async restoreAnalysisHistory(memberId: User["id"] | undefined, ids: string[]) {
    const numericMemberId = toNumericMemberId(memberId)
    const numericIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    if (numericMemberId && numericIds.length > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/restore`, {
          method: "PATCH",
          auth: true,
          body: { ids: numericIds },
        })
      } catch {
        // Local-only analysis records are still handled below.
      }
    }

    restoreAnalysisHistoryItems(ids)
    return { success: true, ids }
  },

  async permanentlyDeleteAnalysisHistory(memberId: User["id"] | undefined, ids: string[]) {
    const numericMemberId = toNumericMemberId(memberId)
    const numericIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    if (numericMemberId && numericIds.length > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/permanent`, {
          method: "DELETE",
          auth: true,
          body: { ids: numericIds },
        })
      } catch {
        // Local-only analysis records are still handled below.
      }
    }

    permanentlyDeleteAnalysisHistoryItems(ids)
    return { success: true, ids }
  },

  async emptyAnalysisHistoryTrash(memberId: User["id"] | undefined) {
    const numericMemberId = toNumericMemberId(memberId)
    if (numericMemberId) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/permanent`, {
          method: "DELETE",
          auth: true,
          body: { all: true },
        })
      } catch {
        // Local-only analysis records are still handled below.
      }
    }

    emptyAnalysisHistoryTrash()
    return { success: true }
  },

  async hardDeleteAnalysisHistory(memberId: User["id"] | undefined, id: string) {
    const numericMemberId = Number(memberId)
    const numericRequestId = Number(id)
    if (Number.isInteger(numericMemberId) && numericMemberId > 0 && Number.isInteger(numericRequestId)) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/${numericRequestId}/permanent`, {
          method: "DELETE",
          auth: true,
        })
      } catch {
        // A locally created analysis has no server request to delete yet.
      }
    }
    permanentlyDeleteAnalysisHistoryItems([id])
    return { success: true, deletedId: id }
  },
}
