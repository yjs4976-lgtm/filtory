import { recentAnalyses } from "@/lib/mockData"
import { USE_MOCK } from "@/lib/constants"
import type { AnalysisHistoryItem } from "@/lib/types"
import { apiClient } from "./apiClient"

function normalizeHistoryItem(item): AnalysisHistoryItem {
  return {
    id: String(item.id),
    hospitalName: item.hospitalName ?? item.hospital_name ?? item.name?.ko ?? "분석 기록",
    category: item.category ?? "derma",
    score: item.score ?? item.total_score ?? 0,
    foreignerFriendlyScore: item.foreignerFriendlyScore ?? item.foreigner_friendly_score ?? item.foreigner_score,
    createdAt: item.createdAt ?? item.created_at ?? item.date ?? "",
  }
}

export async function getHistory(): Promise<AnalysisHistoryItem[]> {
  try {
    const result = await apiClient<unknown[]>("/history", {
      auth: true,
    })
    const records = Array.isArray(result.data) ? result.data : []
    return records.map(normalizeHistoryItem)
  } catch {
    if (!USE_MOCK) {
      return []
    }

    return []
  }
}

export function getDemoHistory(): AnalysisHistoryItem[] {
  return recentAnalyses.map(normalizeHistoryItem)
}
