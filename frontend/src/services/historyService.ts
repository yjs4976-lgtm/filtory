import { recentAnalyses } from "@/lib/mockData"
import { readActiveAnalysisHistory, readTrashedAnalysisHistory } from "@/lib/analysisStorage"
import type { AnalysisHistoryItem, User } from "@/lib/types"
import { apiClient } from "./apiClient"

function normalizeHistoryItem(item: Record<string, unknown>): AnalysisHistoryItem {
  const deletedBy = item.deletedBy ?? item.deleted_by

  return {
    id: String(item.id),
    analysisRequestId: Number(item.analysisRequestId ?? item.analysis_request_id ?? item.id ?? 0) || undefined,
    analysisResultId: Number(item.analysisResultId ?? item.analysis_result_id ?? item.resultId ?? item.result_id ?? 0) || undefined,
    hospitalId: Number(item.hospitalId ?? item.hospital_id ?? 0) || undefined,
    reviewIds: Array.isArray(item.reviewIds) ? item.reviewIds.map(Number).filter(Number.isFinite) : [],
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
        ? Number(item.foreigner_friendly_score ?? item.globalAccessibilityScore ?? item.global_accessibility_score ?? item.foreigner_score ?? 0)
        : Number(item.foreignerFriendlyScore),
    createdAt: String(item.createdAt ?? item.created_at ?? item.date ?? ""),
    selectedReviewCount: Number(item.selectedReviewCount ?? item.selected_review_count ?? 0),
    totalReviewCount: Number(item.totalReviewCount ?? item.total_review_count ?? 0),
    trustScore: Number(item.trustScore ?? item.trust_score ?? item.score ?? 0),
    trustLevel: item.trustLevel || item.trustLevelKey || item.trust_level
      ? String(item.trustLevel ?? item.trustLevelKey ?? item.trust_level)
      : undefined,
    trustGrade: item.trustGrade ? String(item.trustGrade) : undefined,
    trustLevelKey: item.trustLevelKey || item.trust_level
      ? String(item.trustLevelKey ?? item.trust_level)
      : undefined,
    adSuspicion: item.adSuspicion ? String(item.adSuspicion) : undefined,
    adSuspicionScore: Number(item.adSuspicionScore ?? item.ad_suspicion_score ?? item.adScore ?? item.ad_score ?? 0),
    adSuspicionLevel: item.adSuspicionLevel || item.ad_suspicion_level
      ? String(item.adSuspicionLevel ?? item.ad_suspicion_level)
      : undefined,
    informationScore: Number(item.informationScore ?? item.information_score ?? item.placeScore ?? item.place_score ?? 0),
    informationLevel: item.informationLevel || item.information_level
      ? String(item.informationLevel ?? item.information_level)
      : undefined,
    infoCompletenessScore: Number(item.infoCompletenessScore ?? item.info_completeness_score ?? item.placeScore ?? item.place_score ?? 0),
    globalAccessibilityScore: Number(
      item.globalAccessibilityScore ?? item.global_accessibility_score ?? item.foreignerScore ?? item.foreigner_score ?? 0
    ),
    globalAccessibilityLevel: item.globalAccessibilityLevel || item.global_accessibility_level
      ? String(item.globalAccessibilityLevel ?? item.global_accessibility_level)
      : undefined,
    globalAccessRating: Number(
      item.globalAccessRating ??
        item.global_access_rating ??
        item.globalAccessibilityScore ??
        item.global_accessibility_score ??
        item.foreignerScore ??
        item.foreigner_score ??
        0
    ),
    summary: item.summary ? String(item.summary) : undefined,
    suspiciousPhrases: Array.isArray(item.suspiciousPhrases) ? item.suspiciousPhrases.map(String) : [],
    repetitivePhrases: Array.isArray(item.repetitivePhrases) ? item.repetitivePhrases.map(String) : [],
    detectedPatterns: Array.isArray(item.detectedPatterns) ? item.detectedPatterns.map(String) : [],
    detectedReasons: Array.isArray(item.detectedReasons) ? item.detectedReasons.map(String) : [],
    positiveSignals: Array.isArray(item.positiveSignals) ? item.positiveSignals.map(String) : [],
    negativeSignals: Array.isArray(item.negativeSignals) ? item.negativeSignals.map(String) : [],
    recommendation: item.recommendation ? String(item.recommendation) : undefined,
    visitTip: item.visitTip ? String(item.visitTip) : undefined,
    modelVersion: item.modelVersion ? String(item.modelVersion) : undefined,
    resultStatus: item.resultStatus || item.result_status
      ? String(item.resultStatus ?? item.result_status)
      : "completed",
    deletedAt: item.deletedAt || item.deleted_at ? String(item.deletedAt ?? item.deleted_at) : undefined,
    deletedBy: typeof deletedBy === "string" || typeof deletedBy === "number" ? deletedBy : undefined,
  }
}

function toMemberId(memberId?: User["id"]) {
  const numericId = Number(memberId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null
}

export async function getHistory(memberId?: User["id"]): Promise<AnalysisHistoryItem[]> {
  const numericMemberId = toMemberId(memberId)
  const localHistory = readActiveAnalysisHistory()
  if (!numericMemberId) return localHistory

  try {
    const result = await apiClient<unknown[]>(`/api/members/${numericMemberId}/analysis-history`, {
      auth: true,
    })
    const records = Array.isArray(result.data) ? result.data : []
    const normalizedRecords = records.map((item) => normalizeHistoryItem(item as Record<string, unknown>))
    return normalizedRecords.length > 0 ? normalizedRecords : localHistory
  } catch {
    if (localHistory.length > 0) return localHistory
    throw new Error("분석기록 API 조회에 실패했습니다. 로그인 상태나 서버 응답을 확인해주세요.")
  }
}

export async function getTrashHistory(memberId?: User["id"]): Promise<AnalysisHistoryItem[]> {
  const numericMemberId = toMemberId(memberId)
  const localHistory = readTrashedAnalysisHistory()
  if (!numericMemberId) return localHistory

  try {
    const result = await apiClient<unknown[]>(`/api/members/${numericMemberId}/analysis-history/trash`, {
      auth: true,
    })
    const records = Array.isArray(result.data) ? result.data : []
    const normalizedRecords = records.map((item) => normalizeHistoryItem(item as Record<string, unknown>))
    return normalizedRecords.length > 0 ? normalizedRecords : localHistory
  } catch {
    if (localHistory.length > 0) return localHistory
    throw new Error("삭제한 기록 API 조회에 실패했습니다. 로그인 상태나 서버 응답을 확인해주세요.")
  }
}

export function getDemoHistory(): AnalysisHistoryItem[] {
  return recentAnalyses.map((item) => normalizeHistoryItem(item as Record<string, unknown>))
}
