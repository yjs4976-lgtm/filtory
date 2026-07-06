import type { AnalysisHistoryItem, HospitalCategory, User } from "@/lib/types"
import {
  moveAnalysisHistoryItemsToTrash,
  permanentlyDeleteAnalysisHistoryItems,
  restoreAnalysisHistoryItems,
  saveAnalysisHistoryItem,
} from "@/lib/analysisStorage"
import { getTrustLevelKey, type TrustLevelKey } from "@/lib/score"
import { apiClient } from "./apiClient"
import { getHistory, getTrashHistory } from "./historyService"

export type AnalysisHistorySort = "latest" | "oldest" | "trust" | "ad"
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

export function filterAndSortAnalysisHistory(items: AnalysisHistoryItem[], filters: AnalysisHistoryFilters = {}) {
  const keyword = filters.keyword?.trim().toLowerCase() ?? ""
  const category = filters.category ?? "all"
  const trust = filters.trust ?? "all"
  const sort = filters.sort ?? "latest"
  const shouldFilterByKeyword = keyword.length >= 2

  return [...items]
    .filter((item) => !shouldFilterByKeyword || item.hospitalName.toLowerCase().includes(keyword))
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => matchesTrust(item, trust))
    .sort((a, b) => {
      if (sort === "trust") return (b.trustScore ?? b.score) - (a.trustScore ?? a.score)
      if (sort === "ad") return (b.adSuspicionScore ?? 0) - (a.adSuspicionScore ?? 0)
      if (sort === "oldest") return String(a.analyzedAt ?? a.createdAt).localeCompare(String(b.analyzedAt ?? b.createdAt))
      return String(b.analyzedAt ?? b.createdAt).localeCompare(String(a.analyzedAt ?? a.createdAt))
    })
}

export const analysisHistoryService = {
  async getAnalysisHistory(memberId: User["id"] | undefined, filters: AnalysisHistoryFilters = {}) {
    const history = await getHistory(memberId)
    return filterAndSortAnalysisHistory(history, filters)
  },

  async getTrashHistory(memberId: User["id"] | undefined, filters: AnalysisHistoryFilters = {}) {
    const history = await getTrashHistory(memberId)
    return filterAndSortAnalysisHistory(history, filters)
  },

  async saveAnalysisHistoryItem(item: AnalysisHistoryItem) {
    return saveAnalysisHistoryItem(item)
  },

  async deleteAnalysisHistory(memberId: User["id"] | undefined, id: string) {
    return analysisHistoryService.moveAnalysisHistoryToTrash(memberId, [id])
  },

  async moveAnalysisHistoryToTrash(memberId: User["id"] | undefined, ids: string[]) {
    const numericMemberId = Number(memberId)
    const requestIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)

    if (Number.isInteger(numericMemberId) && numericMemberId > 0 && requestIds.length > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/trash`, {
          method: "POST",
          auth: true,
          body: { ids: requestIds },
        })
      } catch {
        // 로컬에만 있는 분석 기록은 아직 서버 request id가 없어서 서버 삭제를 건너뛸 수 있다.
      }
    }
    moveAnalysisHistoryItemsToTrash(ids, memberId)
    return { success: true, ids }
  },

  async restoreAnalysisHistory(memberId: User["id"] | undefined, ids: string[]) {
    const numericMemberId = Number(memberId)
    const requestIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)

    if (Number.isInteger(numericMemberId) && numericMemberId > 0 && requestIds.length > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/trash/restore`, {
          method: "POST",
          auth: true,
          body: { ids: requestIds },
        })
      } catch {
        // 로컬에만 있는 분석 기록은 아직 서버 request id가 없어서 서버 복원을 건너뛸 수 있다.
      }
    }
    restoreAnalysisHistoryItems(ids)
    return { success: true, ids }
  },

  async hardDeleteAnalysisHistory(memberId: User["id"] | undefined, ids: string[]) {
    const numericMemberId = Number(memberId)
    const requestIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)

    if (Number.isInteger(numericMemberId) && numericMemberId > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/trash`, {
          method: "DELETE",
          auth: true,
          body: { ids: requestIds },
        })
      } catch {
        // 로컬에만 있는 분석 기록은 아직 서버 request id가 없어서 서버 삭제를 건너뛸 수 있다.
      }
    }
    permanentlyDeleteAnalysisHistoryItems(ids)
    return { success: true, ids }
  },

  async emptyTrash(memberId: User["id"] | undefined) {
    const numericMemberId = Number(memberId)
    if (Number.isInteger(numericMemberId) && numericMemberId > 0) {
      try {
        await apiClient(`/api/members/${numericMemberId}/analysis-history/trash`, {
          method: "DELETE",
          auth: true,
          body: {},
        })
      } catch {
        // 로컬에만 있는 분석 기록은 아직 서버 request id가 없어서 서버 삭제를 건너뛸 수 있다.
      }
    }
    const trash = await getTrashHistory(undefined)
    permanentlyDeleteAnalysisHistoryItems(trash.map((item) => item.id))
    return { success: true }
  },
}
