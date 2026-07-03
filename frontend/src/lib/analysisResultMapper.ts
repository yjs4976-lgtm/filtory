import { getGlobalAccessibilityCheckLabel } from "./displayLabels"
import { getHistoryHospitalName } from "./historyDisplay"
import type { HospitalCategory, Language } from "./types"

export type TrustResultKey = "very_safe" | "safe" | "normal" | "caution" | "danger"
export type AdSuspicionKey = "low" | "medium" | "high"

export type AnalysisResultViewModel = {
  ids: {
    analysisRequestId?: number
    analysisResultId?: number
    hospitalId?: number
    reviewIds: number[]
  }
  subject: {
    hospitalName: string
    category?: HospitalCategory
  }
  scores: {
    totalScore: number
    trustScore: number
    adSuspicionScore: number
    informationScore: number
    globalAccessibilityScore: number
    analyzedReviewCount: number
  }
  trust: {
    key: TrustResultKey
    label: string
    score: number
    description: string
  }
  ad: {
    key: AdSuspicionKey
    label: string
    score: number
    description: string
  }
  repetition: {
    level: string
    repetitivePhrases: string[]
    suspiciousPhrases: string[]
    detectedPatterns: string[]
    referenceWarnings: string[]
  }
  information: {
    label: string
    completeness: string
    score: number
    checkItems: string[]
    description: string
  }
  globalAccessibility: {
    label: string
    score: number
    maxScore: number
    checks: {
      key: string
      label: string
      checked: boolean
    }[]
  }
  content: {
    summary: string
    recommendation: string
    visitTip: string
  }
  signals: {
    positiveSignals: string[]
    negativeSignals: string[]
    warningSignals: string[]
    specificPhrases: string[]
  }
  meta: {
    modelVersion?: string
    isMockResult: boolean
  }
}

const GLOBAL_ACCESSIBILITY_KEYS = [
  "englishName",
  "englishGuide",
  "englishReviews",
  "googleMapLink",
  "googlePlaceId",
  "homepageOrBookingLink",
  "photoInfo",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function pickRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key]
  return isRecord(value) ? value : {}
}

function recordAt(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = source[key]
  return isRecord(value) ? value : null
}

function firstValue(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "")
}

function scoreValue(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(100, Math.round(numeric)))
  }
  return 0
}

function countValue(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return Math.max(0, Math.round(numeric))
  }
  return 0
}

function optionalNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeCategory(value: unknown): HospitalCategory | undefined {
  if (value === "derma" || value === "eye" || value === "dental") return value
  if (value === "dermatology" || value === "skin") return "derma"
  if (value === "ophthalmology") return "eye"
  if (value === "dentistry") return "dental"
  return undefined
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export function safeStringArray(...values: unknown[]): string[] {
  return uniqueValues(
    values.flatMap((value) => {
      if (!Array.isArray(value)) return []
      return value.map((item) => String(item).trim()).filter(Boolean)
    })
  )
}

function normalizeInput(input: unknown) {
  const root = isRecord(input) ? input : {}
  const data = recordAt(root, "data") ?? {}
  const evidenceJson = recordAt(root, "evidence_json") ?? {}
  const result =
    recordAt(data, "result") ??
    recordAt(root, "result") ??
    recordAt(evidenceJson, "rawResponse") ??
    recordAt(root, "rawResponse")

  if (result && Object.keys(result).length > 0) return { root, result }
  return { root, result: root }
}

function normalizedLevel(value: unknown): string {
  const text = stringValue(value).toLowerCase()
  if (["높음", "high"].includes(text)) return "높음"
  if (["낮음", "low"].includes(text)) return "낮음"
  return "보통"
}

export function deriveAdSuspicionKey(score: number, value?: unknown): AdSuspicionKey {
  const text = stringValue(value).toLowerCase()
  if (text.includes("높") || text === "high") return "high"
  if (text.includes("낮") || text === "low") return "low"
  if (text.includes("보통") || text === "medium") return "medium"
  if (score >= 70) return "high"
  if (score >= 40) return "medium"
  return "low"
}

function adLabel(key: AdSuspicionKey, language: Language) {
  const labels: Record<Language, Record<AdSuspicionKey, string>> = {
    ko: { low: "낮음", medium: "보통", high: "높음" },
    en: { low: "Low", medium: "Medium", high: "High" },
  }
  return labels[language][key]
}

function adDescription(key: AdSuspicionKey, language: Language) {
  if (language === "en") {
    if (key === "high") return "Ad-like wording or repeated patterns may be present, so review carefully."
    if (key === "medium") return "Some promotional wording may be present. Check the review details together."
    return "Few repeated or exaggerated promotional expressions were detected."
  }
  if (key === "high") return "광고성 문구나 반복 패턴 가능성이 있어 신중히 확인해야 해요."
  if (key === "medium") return "일부 홍보성 표현이 있을 수 있어 리뷰 내용을 함께 확인해보세요."
  return "반복적이거나 과장된 홍보 표현이 적게 감지됐어요."
}

export function deriveTrustLevel(
  score: number,
  level?: unknown,
  grade?: unknown,
  language: Language = "ko"
): AnalysisResultViewModel["trust"] {
  const normalizedLevel = stringValue(level).toLowerCase()
  const normalizedGrade = stringValue(grade)
  let key: TrustResultKey | undefined

  if (["very_safe", "very_high"].includes(normalizedLevel) || normalizedGrade.includes("매우 안전")) key = "very_safe"
  if (["safe", "high"].includes(normalizedLevel) || normalizedGrade === "안전") key = key ?? "safe"
  if (["normal", "medium"].includes(normalizedLevel) || normalizedGrade.includes("보통")) key = key ?? "normal"
  if (["caution", "low", "risky"].includes(normalizedLevel) || normalizedGrade.includes("주의")) key = key ?? "caution"
  if (["danger", "very_low"].includes(normalizedLevel)) key = "danger"

  key = key ?? scoreToTrustKey(score)

  const labels = {
    ko: {
      very_safe: "매우 안전",
      safe: "안전",
      normal: "보통",
      caution: "주의",
      danger: "위험",
    },
    en: {
      very_safe: "Very safe",
      safe: "Safe",
      normal: "Normal",
      caution: "Caution",
      danger: "Danger",
    },
  }
  const descriptions = {
    ko: {
      very_safe: "구체적인 방문 경험과 신뢰 신호가 충분해요.",
      safe: "전반적으로 신뢰할 만하지만 최신 정보 확인이 필요해요.",
      normal: "참고할 수는 있지만 일부 정보 확인이 필요해요.",
      caution: "광고성 표현이나 정보 부족 가능성이 있어 신중한 확인이 필요해요.",
      danger: "리뷰 신뢰도가 낮아 병원 선택 전 추가 확인이 꼭 필요해요.",
    },
    en: {
      very_safe: "There are enough concrete visit details and trust signals.",
      safe: "Overall trustworthy, but recent information is still worth checking.",
      normal: "Useful as a reference, but some information should be checked.",
      caution: "Ad-like wording or limited information may require careful checking.",
      danger: "Review trust is low, so additional checking is strongly recommended.",
    },
  }

  return {
    key,
    label: labels[language][key],
    score,
    description: descriptions[language][key],
  }
}

function scoreToTrustKey(score: number): TrustResultKey {
  if (score >= 85) return "very_safe"
  if (score >= 70) return "safe"
  if (score >= 50) return "normal"
  if (score >= 30) return "caution"
  return "danger"
}

export function deriveInformationLabel(score: number, value?: unknown, language: Language = "ko") {
  const text = stringValue(value)
  if (text.includes("충분") || text.includes("구체") || text.toLowerCase() === "high" || score >= 70) {
    return language === "ko" ? "높음" : "High"
  }
  if (text.includes("부족") || text.toLowerCase() === "low" || score < 40) {
    return language === "ko" ? "낮음" : "Low"
  }
  return language === "ko" ? "보통" : "Medium"
}

export function deriveGlobalAccessibilityLabel(score: number, value?: unknown, language: Language = "ko") {
  const level = normalizedLevel(value)
  if (level === "높음" || score >= 70) return language === "ko" ? "높음" : "High"
  if (level === "낮음" || score < 40) return language === "ko" ? "낮음" : "Low"
  return language === "ko" ? "보통" : "Medium"
}

function informationDescription(score: number, language: Language) {
  if (language === "en") {
    if (score >= 70) return "The reviews include concrete details such as waiting time, explanations, and visit experience."
    if (score >= 40) return "The reviews include some reference details about waiting, explanations, or visit experience."
    return "There are limited concrete details, so checking more reviews may help."
  }
  if (score >= 70) return "리뷰 안에 대기 시간, 설명, 진료 경험 등 참고 정보가 충분히 포함되어 있어요."
  if (score >= 40) return "리뷰 안에 대기 시간, 설명, 진료 경험 등 일부 참고 정보가 포함되어 있어요."
  return "리뷰 안의 구체적인 정보가 적어 추가 리뷰를 함께 확인하면 좋아요."
}

function isReferenceWarning(value: string) {
  return /(최신 리뷰|병원 기본 정보|방문 전|확인|참고|recent reviews|basic clinic|before visiting|check)/i.test(value)
}

function normalizeChecks(value: unknown, language: Language) {
  const checks = isRecord(value) ? value : {}

  return GLOBAL_ACCESSIBILITY_KEYS.map((key) => ({
    key,
    label: getGlobalAccessibilityCheckLabel(key, language),
    checked: Boolean(checks[key]),
  }))
}

function normalizeScoreMax(score: number, maxScore?: number) {
  if (maxScore && maxScore > 0) return maxScore
  return score > 5 ? 100 : 5
}

function globalAccessRatingToScore(value: unknown) {
  const numeric = optionalNumber(value)
  if (numeric === undefined) return undefined
  return numeric <= 5 ? numeric * 20 : numeric
}

export function normalizeAnalysisResult(input: unknown, options: { language?: Language } = {}): AnalysisResultViewModel {
  const language = options.language ?? "ko"
  const { root, result } = normalizeInput(input)
  const evidence = pickRecord(result, "evidence")
  const evidenceJson = pickRecord(root, "evidence_json")
  const totalScore = scoreValue(result.totalScore, result.total_score, root.score, root.total_score, result.trustScore, root.trustScore)
  const trustScore = scoreValue(result.trustScore, result.trust_score, root.trustScore, root.trust_score, totalScore)
  const adSuspicionScore = scoreValue(result.adSuspicionScore, result.adScore, result.ad_score, root.adSuspicionScore, root.ad_score)
  const informationScore = scoreValue(result.informationScore, result.placeScore, result.place_score, root.informationScore, root.infoCompletenessScore)
  const globalAccessibilityScore = scoreValue(
    result.globalAccessibilityScore,
    result.foreignerScore,
    result.foreigner_score,
    root.globalAccessibilityScore,
    root.foreignerFriendlyScore,
    globalAccessRatingToScore(root.globalAccessRating)
  )
  const analyzedReviewCount = countValue(result.analyzedReviewCount, root.selectedReviewCount, root.totalReviewCount, root.review_count)
  const warningSignals = safeStringArray(result.warningSignals, evidence.warnings, evidenceJson.warnings)
  const detectedPatternSource = safeStringArray(result.detectedPatterns, root.detectedPatterns, root.detectedReasons)
  const referenceWarnings = uniqueValues([...warningSignals, ...detectedPatternSource].filter(isReferenceWarning))
  const detectedPatterns = detectedPatternSource.filter((item) => !isReferenceWarning(item))
  const suspiciousPhrases = safeStringArray(result.suspiciousPhrases, evidence.suspiciousPhrases, root.suspiciousPhrases).filter(
    (item) => !isReferenceWarning(item)
  )
  const repetitivePhrases = safeStringArray(result.repetitivePhrases, evidence.repetitivePhrases, root.repetitivePhrases).filter(
    (item) => !isReferenceWarning(item)
  )
  const adKey = deriveAdSuspicionKey(adSuspicionScore, firstValue(result.adSuspicion, result.adSuspicionLevel, root.adSuspicionLevel))
  const maxScore = normalizeScoreMax(
    globalAccessibilityScore,
    optionalNumber(firstValue(result.globalAccessibilityMaxScore, root.globalAccessibilityMaxScore))
  )
  const summary = stringValue(result.summary) || stringValue(root.summary)
  const recommendation = stringValue(result.recommendation) || stringValue(root.recommendation)
  const visitTip = stringValue(result.visitTip) || stringValue(evidenceJson.visitTip)

  return {
    ids: {
      analysisRequestId: optionalNumber(firstValue(root.analysisRequestId, result.analysisRequestId)),
      analysisResultId: optionalNumber(firstValue(root.analysisResultId, result.analysisResultId)),
      hospitalId: optionalNumber(firstValue(root.hospitalId, result.hospitalId)),
      reviewIds: safeStringArray(root.reviewIds, result.reviewIds).map(Number).filter(Number.isFinite),
    },
    subject: {
      hospitalName: getHistoryHospitalName(root, language) ||
        stringValue(firstValue(root.hospitalName, root.hospital_name, result.hospitalName, result.hospital_name)) ||
        (language === "ko" ? "분석한 병원" : "Analyzed clinic"),
      category: normalizeCategory(firstValue(root.category, root.hospitalCategory, result.category, result.hospitalCategory)),
    },
    scores: {
      totalScore,
      trustScore,
      adSuspicionScore,
      informationScore,
      globalAccessibilityScore,
      analyzedReviewCount,
    },
    trust: deriveTrustLevel(trustScore, firstValue(result.trustLevelKey, result.trust_level, root.trustLevelKey, root.trustLevel), result.trustGrade, language),
    ad: {
      key: adKey,
      label: adLabel(adKey, language),
      score: adSuspicionScore,
      description: adDescription(adKey, language),
    },
    repetition: {
      level: normalizedLevel(result.repetitionLevel),
      repetitivePhrases,
      suspiciousPhrases,
      detectedPatterns,
      referenceWarnings,
    },
    information: {
      label: deriveInformationLabel(informationScore, firstValue(result.informationLevel, result.informationCompleteness, root.informationLevel), language),
      completeness: stringValue(firstValue(result.informationLevel, result.informationCompleteness, root.informationLevel)) || deriveInformationLabel(informationScore, undefined, language),
      score: informationScore,
      checkItems: safeStringArray(evidence.checkItems, evidenceJson.checkItems),
      description: informationDescription(informationScore, language),
    },
    globalAccessibility: {
      label: deriveGlobalAccessibilityLabel(globalAccessibilityScore, firstValue(result.globalAccessibilityLevel, root.globalAccessibilityLevel), language),
      score: globalAccessibilityScore,
      maxScore,
      checks: normalizeChecks(firstValue(result.globalAccessibilityChecks, root.globalAccessibilityChecks), language),
    },
    content: {
      summary: summary || (language === "ko" ? "아직 요약할 수 있는 리뷰 내용이 충분하지 않아요." : "There is not enough review content to summarize yet."),
      recommendation:
        recommendation ||
        (language === "ko"
          ? "분석 결과는 참고 정보로 활용하고, 방문 전 최신 리뷰와 병원 안내를 함께 확인해 주세요."
          : "Use this result as reference information and check recent reviews plus clinic guidance before visiting."),
      visitTip:
        visitTip ||
        (language === "ko"
          ? "방문 전 진료 항목, 비용 안내, 예약 필요 여부를 병원에 확인해 보세요."
          : "Before visiting, confirm treatments, costs, and booking requirements with the clinic."),
    },
    signals: {
      positiveSignals: safeStringArray(result.positiveSignals, evidence.positiveSignals, root.positiveSignals),
      negativeSignals: safeStringArray(result.negativeSignals, root.negativeSignals),
      warningSignals,
      specificPhrases: safeStringArray(evidence.specificPhrases),
    },
    meta: {
      modelVersion: stringValue(firstValue(result.modelVersion, root.modelVersion)),
      isMockResult: stringValue(firstValue(result.modelVersion, root.modelVersion)).includes("mock"),
    },
  }
}
