import { recentAnalyses } from "@/lib/mockData"
import { readAnalysisHistory } from "@/lib/analysisStorage"
import type { AnalysisHistoryItem, User } from "@/lib/types"
import { apiClient } from "./apiClient"

function normalizeHistoryItem(item: Record<string, unknown>): AnalysisHistoryItem {
  return {
    id: String(item.id),
    hospitalName: String(item.hospitalName ?? item.hospital_name ?? "Analysis record"),
    category: item.category === "eye" || item.category === "dental" ? item.category : "derma",
    hospitalCategory: String(item.hospitalCategory ?? item.hospital_category ?? item.category ?? "skin"),
    hospitalAddress: String(item.hospitalAddress ?? item.hospital_address ?? ""),
    region: String(item.region ?? ""),
    sourceName: item.sourceName ? String(item.sourceName) : undefined,
    sourceUrl: item.sourceUrl ? String(item.sourceUrl) : undefined,
    score: Number(item.score ?? item.total_score ?? item.trustScore ?? item.trust_score ?? 0),
    foreignerFriendlyScore:
      item.foreignerFriendlyScore === undefined
        ? Number(item.foreigner_friendly_score ?? item.foreigner_score ?? 0)
        : Number(item.foreignerFriendlyScore),
    createdAt: String(item.createdAt ?? item.created_at ?? item.date ?? ""),
    selectedReviewCount: Number(item.selectedReviewCount ?? item.selected_review_count ?? 0),
    totalReviewCount: Number(item.totalReviewCount ?? item.total_review_count ?? 0),
    trustScore: Number(item.trustScore ?? item.trust_score ?? item.score ?? 0),
    trustLevel: item.trustLevel ? String(item.trustLevel) : undefined,
    adSuspicionLevel: item.adSuspicionLevel || item.ad_suspicion_level
      ? String(item.adSuspicionLevel ?? item.ad_suspicion_level)
      : undefined,
    summary: item.summary ? String(item.summary) : undefined,
    detectedReasons: Array.isArray(item.detectedReasons) ? item.detectedReasons.map(String) : [],
    resultStatus: item.resultStatus || item.result_status
      ? String(item.resultStatus ?? item.result_status)
      : "completed",
  }
}

function toMemberId(memberId?: User["id"]) {
  const numericId = Number(memberId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null
}

export async function getHistory(memberId?: User["id"]): Promise<AnalysisHistoryItem[]> {
  const numericMemberId = toMemberId(memberId)
  if (!numericMemberId) return readAnalysisHistory()

  try {
    const result = await apiClient<unknown[]>(`/api/members/${numericMemberId}/analysis-history`, {
      auth: true,
    })
    const records = Array.isArray(result.data) ? result.data : []
    const normalizedRecords = records.map((item) => normalizeHistoryItem(item as Record<string, unknown>))
    return normalizedRecords.length > 0 ? normalizedRecords : readAnalysisHistory()
  } catch {
    return readAnalysisHistory()
  }
}

export function getDemoHistory(): AnalysisHistoryItem[] {
  return recentAnalyses.map((item) => normalizeHistoryItem(item as Record<string, unknown>))
}
