import type { AnalysisHistoryItem, CurrentReviewAnalysis } from "./types"

const STORAGE_KEY = "filtory-analysis-history"
const LEGACY_STORAGE_KEYS = ["analysisHistory", "reviewHistory", "filtory-review-history"]
const CURRENT_ANALYSIS_KEY = "filtory-current-review-analysis"

function toFiveStarScore(score?: number, maxScore?: number) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0
  const resolvedMax = typeof maxScore === "number" && maxScore > 0
    ? maxScore
    : score > 5
      ? 100
      : 5
  return Math.max(0, Math.min(5, Math.round((score / resolvedMax) * 5)))
}

function optionalNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizeStoredHistoryItem(item: Record<string, unknown>): AnalysisHistoryItem | null {
  const rawName = item.hospitalName ?? item.hospital_name ?? item.name
  const hospitalName =
    typeof rawName === "string"
      ? rawName
      : rawName && typeof rawName === "object" && "ko" in rawName
        ? String((rawName as { ko?: unknown }).ko ?? "")
        : ""
  const rawCategory = String(item.category ?? item.hospitalCategory ?? "").trim()
  const category =
    rawCategory === "eye" || rawCategory === "안과" || rawCategory === "ophthalmology"
      ? "eye"
      : rawCategory === "dental" || rawCategory === "치과" || rawCategory === "dentistry"
        ? "dental"
        : "derma"
  const createdAt = String(item.createdAt ?? item.created_at ?? item.analyzedAt ?? item.date ?? "")
  const id = String(item.id ?? "")

  if (!id || !hospitalName) return null
  const globalAccessibilityScore = Number(
    item.globalAccessibilityScore ?? item.global_accessibility_score ?? item.foreignerScore ?? item.foreigner_score ?? 0
  )
  const globalAccessRating = Number(item.globalAccessRating ?? item.global_access_rating ?? globalAccessibilityScore)

  return {
    ...item,
    id,
    analysisRequestId: Number(item.analysisRequestId ?? item.analysis_request_id ?? item.id ?? 0) || undefined,
    analysisResultId: Number(item.analysisResultId ?? item.analysis_result_id ?? item.resultId ?? item.result_id ?? 0) || undefined,
    hospitalId: Number(item.hospitalId ?? item.hospital_id ?? 0) || undefined,
    hospitalName,
    hospitalNameKo: item.hospitalNameKo || item.hospital_name_ko ? String(item.hospitalNameKo ?? item.hospital_name_ko) : undefined,
    hospitalNameEn: item.hospitalNameEn || item.hospital_name_en ? String(item.hospitalNameEn ?? item.hospital_name_en) : undefined,
    hospitalEnglishName: item.hospitalEnglishName || item.hospital_english_name
      ? String(item.hospitalEnglishName ?? item.hospital_english_name)
      : undefined,
    englishName: item.englishName || item.english_name ? String(item.englishName ?? item.english_name) : undefined,
    category,
    categoryKoLabel: item.categoryKoLabel || item.category_ko_label
      ? String(item.categoryKoLabel ?? item.category_ko_label)
      : undefined,
    categoryEnLabel: item.categoryEnLabel || item.category_en_label
      ? String(item.categoryEnLabel ?? item.category_en_label)
      : undefined,
    hospitalAddress: String(
      item.hospitalAddress ?? item.hospital_address ?? item.roadAddress ?? item.road_address ?? item.address ?? ""
    ),
    roadAddress: item.roadAddress || item.road_address ? String(item.roadAddress ?? item.road_address) : undefined,
    address: item.address ? String(item.address) : undefined,
    createdAt,
    analyzedAt: item.analyzedAt ? String(item.analyzedAt) : undefined,
    deletedAt: item.deletedAt || item.deleted_at ? String(item.deletedAt ?? item.deleted_at) : undefined,
    deletedBy: item.deletedBy ?? item.deleted_by,
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
    score: Number(item.score ?? item.reviewTrustScore ?? item.review_trust_score ?? item.totalScore ?? item.total_score ?? item.trustScore ?? item.trust_score ?? 0),
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
    adSuspicionScore: Number(item.adSuspicionScore ?? item.ad_suspicion_score ?? item.adScore ?? item.ad_score ?? 0),
    informationScore: Number(item.informationScore ?? item.information_score ?? item.placeScore ?? item.place_score ?? 0),
    globalAccessibilityScore,
    globalAccessRating: toFiveStarScore(globalAccessRating),
  } as AnalysisHistoryItem
}

function readHistoryFromStorageKey(key: string): AnalysisHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => normalizeStoredHistoryItem(item as Record<string, unknown>))
      .filter((item): item is AnalysisHistoryItem => Boolean(item))
  } catch {
    return []
  }
}

export function readAnalysisHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return []

  const itemsById = new Map<string, AnalysisHistoryItem>()
  for (const item of readHistoryFromStorageKey(STORAGE_KEY)) {
    itemsById.set(item.id, item)
  }
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    for (const item of readHistoryFromStorageKey(legacyKey)) {
      if (!itemsById.has(item.id)) itemsById.set(item.id, item)
    }
  }

  return Array.from(itemsById.values())
}

export function readActiveAnalysisHistory(): AnalysisHistoryItem[] {
  return readAnalysisHistory().filter((item) => !item.deletedAt)
}

export function readTrashedAnalysisHistory(): AnalysisHistoryItem[] {
  return readAnalysisHistory().filter((item) => Boolean(item.deletedAt))
}

export function writeAnalysisHistory(items: AnalysisHistoryItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function saveAnalysisHistoryItem(item: AnalysisHistoryItem) {
  const items = readAnalysisHistory()
  const nextItems = [item, ...items.filter((current) => current.id !== item.id)]
  writeAnalysisHistory(nextItems)
  return item
}

export function deleteAnalysisHistoryItem(id: string) {
  moveAnalysisHistoryItemsToTrash([id])
}

export function moveAnalysisHistoryItemsToTrash(ids: string[], deletedBy?: string | number) {
  const idSet = new Set(ids)
  const items = readAnalysisHistory()
  const deletedAt = new Date().toISOString()
  writeAnalysisHistory(items.map((item) => (
    idSet.has(item.id)
      ? { ...item, deletedAt, deletedBy }
      : item
  )))
}

export function restoreAnalysisHistoryItems(ids: string[]) {
  const idSet = new Set(ids)
  const items = readAnalysisHistory()
  writeAnalysisHistory(items.map((item) => {
    if (!idSet.has(item.id)) return item
    const restoredItem = { ...item }
    delete restoredItem.deletedAt
    delete restoredItem.deletedBy
    return restoredItem
  }))
}

export function permanentlyDeleteAnalysisHistoryItems(ids: string[]) {
  const idSet = new Set(ids)
  const items = readAnalysisHistory()
  writeAnalysisHistory(items.filter((item) => !idSet.has(item.id)))
}

export function readCurrentReviewAnalysis(): CurrentReviewAnalysis | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(CURRENT_ANALYSIS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.id || !parsed?.hospitalName || !parsed?.category || !parsed?.analyzedAt) {
      return null
    }

    return parsed as CurrentReviewAnalysis
  } catch {
    return null
  }
}

export function writeCurrentReviewAnalysis(item: CurrentReviewAnalysis) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(item))
}

function normalizeAnalysisLevel(level?: string): "낮음" | "보통" | "높음" | "low" | "medium" | "high" {
  if (level === "높음" || level === "high") return level
  if (level === "낮음" || level === "low") return level
  return "medium"
}

function normalizeTrustLevelKey(level?: string): CurrentReviewAnalysis["trustLevelKey"] {
  if (
    level === "very_safe" ||
    level === "safe" ||
    level === "normal" ||
    level === "caution" ||
    level === "danger" ||
    level === "very_high" ||
    level === "high" ||
    level === "medium" ||
    level === "low" ||
    level === "very_low"
  ) {
    return level
  }

  return "medium"
}

export function writeCurrentReviewAnalysisFromHistory(item: AnalysisHistoryItem) {
  const trustScore = item.trustScore ?? item.score ?? 0
  const adSuspicionScore = item.adSuspicionScore ?? 0
  const informationScore = item.informationScore ?? item.infoCompletenessScore ?? 0
  const globalAccessibilityScore =
    item.globalAccessibilityScore ??
    item.foreignerFriendlyScore ??
    (typeof item.globalAccessRating === "number" ? item.globalAccessRating * 20 : 0)
  const suspiciousPhrases = item.suspiciousPhrases ?? []
  const repetitivePhrases = item.repetitivePhrases ?? []
  const positiveSignals = item.positiveSignals ?? item.trustworthyPhrases ?? []
  const negativeSignals = item.negativeSignals ?? []

  writeCurrentReviewAnalysis({
    id: item.id,
    analysisRequestId: item.analysisRequestId ?? (Number.isInteger(Number(item.id)) ? Number(item.id) : undefined),
    analysisResultId: item.analysisResultId,
    hospitalId: item.hospitalId,
    reviewIds: item.reviewIds,
    totalScore: item.score ?? trustScore,
    trustScore,
    adScore: adSuspicionScore,
    adSuspicionScore,
    placeScore: informationScore,
    informationScore,
    foreignerScore: globalAccessibilityScore,
    globalAccessibilityScore,
    globalAccessibilityMaxScore: globalAccessibilityScore > 5 ? 100 : 5,
    trustGrade: item.trustGrade ?? item.trustLevel ?? "",
    trustLevelKey: normalizeTrustLevelKey(item.trustLevelKey ?? item.trustLevel),
    adSuspicion: item.adSuspicion,
    adSuspicionLevel: normalizeAnalysisLevel(item.adSuspicionLevel),
    informationLevel: item.informationLevel ?? "",
    globalAccessibilityLevel: item.globalAccessibilityLevel ?? "",
    detectedPatterns: item.detectedPatterns ?? item.detectedReasons ?? [],
    suspiciousPhrases,
    repetitivePhrases,
    positiveSignals,
    negativeSignals,
    warningSignals: negativeSignals,
    summary: item.summary ?? "",
    recommendation: item.recommendation ?? "",
    visitTip: item.visitTip ?? "",
    evidence: {
      suspiciousPhrases,
      specificPhrases: positiveSignals,
      repetitivePhrases,
      warnings: negativeSignals,
      positiveSignals,
      checkItems: [],
    },
    analyzedReviewCount: item.selectedReviewCount ?? item.totalReviewCount ?? item.reviewCount ?? 0,
    modelVersion: item.modelVersion ?? "",
    category: item.category,
    categoryKoLabel: item.categoryKoLabel,
    categoryEnLabel: item.categoryEnLabel,
    regionId: item.regionId,
    regionLabel: item.regionLabel,
    regionKoLabel: item.regionKoLabel,
    regionEnLabel: item.regionEnLabel,
    regionProvinceCode: item.regionProvinceCode,
    regionDistrictCode: item.regionDistrictCode,
    hospitalAddress: item.hospitalAddress,
    roadAddress: item.roadAddress,
    address: item.address,
    hospitalName: item.hospitalName,
    hospitalNameKo: item.hospitalNameKo,
    hospitalNameEn: item.hospitalNameEn,
    hospitalEnglishName: item.hospitalEnglishName,
    englishName: item.englishName,
    analyzedAt: item.analyzedAt ?? item.createdAt,
  })
}
