import { recentAnalyses } from "@/lib/mockData"
import { readActiveAnalysisHistory, readTrashedAnalysisHistory } from "@/lib/analysisStorage"
import type { AnalysisHistoryItem, User } from "@/lib/types"
import { apiClient } from "./apiClient"

function toFiveStarScore(score?: number, maxScore?: number) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0
  const resolvedMax = typeof maxScore === "number" && maxScore > 0
    ? maxScore
    : score > 5
      ? 100
      : 5
  return Math.max(0, Math.min(5, Math.round((score / resolvedMax) * 5)))
}

function normalizeCategory(value: unknown): AnalysisHistoryItem["category"] {
  const category = String(value ?? "").trim().toLowerCase()
  if (category === "eye" || category === "안과" || category === "ophthalmology") return "eye"
  if (category === "dental" || category === "치과" || category === "dentistry") return "dental"
  return "derma"
}

function optionalNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizeHistoryItem(item: Record<string, unknown>): AnalysisHistoryItem {
  const deletedBy = item.deletedBy ?? item.deleted_by
  const globalAccessibilityScore = Number(
    item.globalAccessibilityScore ?? item.global_accessibility_score ?? item.foreignerScore ?? item.foreigner_score ?? 0
  )
  const globalAccessRating = Number(
    item.globalAccessRating ??
      item.global_access_rating ??
      globalAccessibilityScore
  )

  return {
    id: String(item.id),
    analysisRequestId: Number(item.analysisRequestId ?? item.analysis_request_id ?? item.id ?? 0) || undefined,
    analysisResultId: Number(item.analysisResultId ?? item.analysis_result_id ?? item.resultId ?? item.result_id ?? 0) || undefined,
    hospitalId: Number(item.hospitalId ?? item.hospital_id ?? 0) || undefined,
    reviewIds: Array.isArray(item.reviewIds) ? item.reviewIds.map(Number).filter(Number.isFinite) : [],
    hospitalName: String(item.hospitalName ?? item.hospital_name ?? "Analysis record"),
    hospitalNameKo: item.hospitalNameKo || item.hospital_name_ko ? String(item.hospitalNameKo ?? item.hospital_name_ko) : undefined,
    hospitalNameEn: item.hospitalNameEn || item.hospital_name_en ? String(item.hospitalNameEn ?? item.hospital_name_en) : undefined,
    hospitalEnglishName: item.hospitalEnglishName || item.hospital_english_name
      ? String(item.hospitalEnglishName ?? item.hospital_english_name)
      : undefined,
    englishName: item.englishName || item.english_name ? String(item.englishName ?? item.english_name) : undefined,
    category: normalizeCategory(item.category ?? item.hospitalCategory ?? item.hospital_category),
    categoryKoLabel: item.categoryKoLabel || item.category_ko_label ? String(item.categoryKoLabel ?? item.category_ko_label) : undefined,
    categoryEnLabel: item.categoryEnLabel || item.category_en_label ? String(item.categoryEnLabel ?? item.category_en_label) : undefined,
    hospitalCategory: String(item.hospitalCategory ?? item.hospital_category ?? item.category ?? "skin"),
    hospitalAddress: String(
      item.hospitalAddress ?? item.hospital_address ?? item.roadAddress ?? item.road_address ?? item.address ?? ""
    ),
    roadAddress: item.roadAddress || item.road_address ? String(item.roadAddress ?? item.road_address) : undefined,
    address: item.address ? String(item.address) : undefined,
    region: String(item.region ?? item.hospitalRegion ?? item.hospital_region ?? ""),
    hospitalRegion: item.hospitalRegion || item.hospital_region ? String(item.hospitalRegion ?? item.hospital_region) : undefined,
    regionId: item.regionId || item.region_id ? String(item.regionId ?? item.region_id) : undefined,
    regionLabel: item.regionLabel || item.region_label ? String(item.regionLabel ?? item.region_label) : undefined,
    regionKoLabel: item.regionKoLabel || item.region_ko_label ? String(item.regionKoLabel ?? item.region_ko_label) : undefined,
    regionEnLabel: item.regionEnLabel || item.region_en_label ? String(item.regionEnLabel ?? item.region_en_label) : undefined,
    regionProvinceCode: item.regionProvinceCode || item.region_province_code
      ? String(item.regionProvinceCode ?? item.region_province_code)
      : undefined,
    regionDistrictCode: item.regionDistrictCode || item.region_district_code
      ? String(item.regionDistrictCode ?? item.region_district_code)
      : undefined,
    sourceName: item.sourceName || item.source_name ? String(item.sourceName ?? item.source_name) : undefined,
    sourceUrl: item.sourceUrl || item.source_url ? String(item.sourceUrl ?? item.source_url) : undefined,
    score: Number(item.score ?? item.reviewTrustScore ?? item.review_trust_score ?? item.totalScore ?? item.total_score ?? item.trustScore ?? item.trust_score ?? 0),
    foreignerFriendlyScore:
      item.foreignerFriendlyScore === undefined
        ? Number(item.foreigner_friendly_score ?? item.globalAccessibilityScore ?? item.global_accessibility_score ?? item.foreigner_score ?? 0)
        : Number(item.foreignerFriendlyScore),
    createdAt: String(item.createdAt ?? item.created_at ?? item.date ?? ""),
    selectedReviewCount: Number(item.selectedReviewCount ?? item.selected_review_count ?? 0),
    totalReviewCount: Number(item.totalReviewCount ?? item.total_review_count ?? 0),
    trustScore: Number(item.reviewTrustScore ?? item.review_trust_score ?? item.trustScore ?? item.trust_score ?? item.score ?? item.totalScore ?? item.total_score ?? 0),
    reviewTrustScore: optionalNumber(item.reviewTrustScore ?? item.review_trust_score),
    evidenceScore: optionalNumber(item.evidenceScore ?? item.evidence_score),
    riskScore: optionalNumber(item.riskScore ?? item.risk_score),
    specificityScore: optionalNumber(item.specificityScore ?? item.specificity_score),
    balanceScore: optionalNumber(item.balanceScore ?? item.balance_score),
    diversityScore: optionalNumber(item.diversityScore ?? item.diversity_score),
    informativeScore: optionalNumber(item.informativeScore ?? item.informative_score),
    naturalnessScore: optionalNumber(item.naturalnessScore ?? item.naturalness_score),
    promoSignalScore: optionalNumber(item.promoSignalScore ?? item.promo_signal_score),
    repetitionScore: optionalNumber(item.repetitionScore ?? item.repetition_score),
    exaggerationScore: optionalNumber(item.exaggerationScore ?? item.exaggeration_score),
    eventDiscountScore: optionalNumber(item.eventDiscountScore ?? item.event_discount_score),
    reviewBurstScore:
      item.reviewBurstScore === null || item.review_burst_score === null
        ? null
        : optionalNumber(item.reviewBurstScore ?? item.review_burst_score),
    reviewBurstStatus: item.reviewBurstStatus || item.review_burst_status
      ? String(item.reviewBurstStatus ?? item.review_burst_status)
      : undefined,
    analysisConfidence: item.analysisConfidence || item.analysis_confidence
      ? String(item.analysisConfidence ?? item.analysis_confidence)
      : undefined,
    analysisConfidenceDescription: item.analysisConfidenceDescription || item.analysis_confidence_description
      ? String(item.analysisConfidenceDescription ?? item.analysis_confidence_description)
      : undefined,
    scoreBreakdown: item.scoreBreakdown && typeof item.scoreBreakdown === "object"
      ? item.scoreBreakdown as AnalysisHistoryItem["scoreBreakdown"]
      : undefined,
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
    globalAccessibilityScore,
    globalAccessibilityLevel: item.globalAccessibilityLevel || item.global_accessibility_level
      ? String(item.globalAccessibilityLevel ?? item.global_accessibility_level)
      : undefined,
    globalAccessRating: toFiveStarScore(globalAccessRating),
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
