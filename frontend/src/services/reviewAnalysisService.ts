import type { ReviewAnalyzeRequest, ReviewAnalyzeResponse } from "@/lib/types"
import { apiClient } from "./apiClient"

const ANALYZE_ERROR_MESSAGE = "분석 중 오류가 발생했어요. 다시 시도해주세요."

type BackendAnalysisData = {
  analysisRequestId?: number
  analysisResultId?: number
  hospitalId?: number
  reviewIds?: number[]
  result?: Partial<ReviewAnalyzeResponse> & Record<string, unknown>
}

type ReviewOcrData = {
  text?: string
  reviews?: string[]
  source?: string
  modelVersion?: string
}

type GlobalAccessibilityChecks = NonNullable<ReviewAnalyzeResponse["globalAccessibilityChecks"]>
type GlobalAccessibilityCheckKey = keyof GlobalAccessibilityChecks

const GLOBAL_ACCESSIBILITY_DISPLAY_KEYS: GlobalAccessibilityCheckKey[] = [
  "googleMapLink",
  "googlePlaceId",
  "englishName",
  "englishGuide",
  "englishReviews",
  "homepageOrBookingLink",
  "photoInfo",
]

const GLOBAL_ACCESSIBILITY_CHECK_ALIASES: Record<GlobalAccessibilityCheckKey, string[]> = {
  googleMapLink: ["googleMapLink", "googleMapUrl", "google_map_url", "googleRegistered", "google_registered"],
  googlePlaceId: ["googlePlaceId", "google_place_id"],
  englishName: ["englishName", "english_name"],
  englishGuide: ["englishGuide", "hasEnglishInfo", "has_english_info"],
  englishReviews: ["englishReviews", "hasEnglishReviews", "has_english_reviews"],
  homepageOrBookingLink: [
    "homepageOrBookingLink",
    "homepageUrl",
    "homepage_url",
    "reservationLink",
    "hasReservationLink",
    "has_reservation_link",
  ],
  photoInfo: ["photoInfo", "hasGooglePhotos", "has_google_photos", "hasPhotos", "has_photos"],
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function normalizeEvidence(value: unknown): ReviewAnalyzeResponse["evidence"] {
  const evidence = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    suspiciousPhrases: toStringArray(evidence.suspiciousPhrases),
    specificPhrases: toStringArray(evidence.specificPhrases),
    repetitivePhrases: toStringArray(evidence.repetitivePhrases),
    warnings: toStringArray(evidence.warnings),
    positiveSignals: toStringArray(evidence.positiveSignals),
    checkItems: toStringArray(evidence.checkItems),
  }
}

function normalizeLevel(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") return value
  if (value === "낮음") return "low"
  if (value === "보통") return "medium"
  if (value === "높음") return "high"
  return "medium"
}

function normalizeTrustLevel(value: unknown): ReviewAnalyzeResponse["trustLevelKey"] {
  if (
    value === "very_safe" ||
    value === "safe" ||
    value === "normal" ||
    value === "caution" ||
    value === "danger" ||
    value === "very_high" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "very_low"
  ) {
    return value
  }

  return "medium"
}

function normalizeInformationCompleteness(value: unknown): "low" | "medium" | "high" {
  if (value === "충분" || value === "구체적" || value === "매우 구체적" || value === "high") return "high"
  if (value === "부족" || value === "정보 부족" || value === "매우 부족" || value === "low") return "low"
  return "medium"
}

function buildGlobalAccessibilityChecks(payload: ReviewAnalyzeRequest) {
  return {
    googleMapLink: Boolean(payload.googleMapUrl || payload.googleRegistered || payload.naverPlaceUrl || payload.kakaoPlaceUrl),
    googlePlaceId: Boolean(payload.googlePlaceId),
    englishName: Boolean(payload.englishName),
    englishGuide: Boolean(payload.hasEnglishInfo),
    englishReviews: Boolean(payload.englishReviews ?? payload.hasEnglishReviews),
    homepageOrBookingLink: Boolean(payload.homepageUrl || payload.naverPlaceUrl),
    photoInfo: Boolean(payload.hasGooglePhotos || payload.hasPhotos),
  }
}

function calculateGlobalAccessibilityFallbackScore(values: GlobalAccessibilityChecks) {
  const weights: Record<keyof GlobalAccessibilityChecks, number> = {
    googleMapLink: 20,
    googlePlaceId: 15,
    englishName: 20,
    englishGuide: 20,
    englishReviews: 10,
    homepageOrBookingLink: 5,
    photoInfo: 10,
  }

  return Object.entries(weights).reduce((score, [key, weight]) => {
    return score + (values[key as keyof GlobalAccessibilityChecks] ? weight : 0)
  }, 0)
}

function optionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value > 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "y"].includes(normalized)) return true
    if (["false", "0", "no", "n", ""].includes(normalized)) return false
  }
  return undefined
}

function getAliasedBoolean(source: Record<string, unknown>, key: GlobalAccessibilityCheckKey) {
  for (const alias of GLOBAL_ACCESSIBILITY_CHECK_ALIASES[key]) {
    const value = toBoolean(source[alias])
    if (value !== undefined) return value
  }

  return undefined
}

function normalizeApiGlobalAccessibilityChecks(value: unknown) {
  if (!value || typeof value !== "object") return null

  const source = value as Record<string, unknown>
  const checks: Partial<GlobalAccessibilityChecks> = {}
  let hasAnyCheck = false

  for (const key of GLOBAL_ACCESSIBILITY_DISPLAY_KEYS) {
    const checkValue = getAliasedBoolean(source, key)
    if (checkValue !== undefined) {
      checks[key] = checkValue
      hasAnyCheck = true
    }
  }

  return hasAnyCheck ? checks : null
}

function normalizeGlobalAccessibilityChecks(apiChecks: unknown, fallbackChecks: GlobalAccessibilityChecks) {
  const normalizedApiChecks = normalizeApiGlobalAccessibilityChecks(apiChecks)

  return GLOBAL_ACCESSIBILITY_DISPLAY_KEYS.reduce<GlobalAccessibilityChecks>((checks, key) => {
    checks[key] = normalizedApiChecks?.[key] ?? fallbackChecks[key] ?? false
    return checks
  }, {})
}

function buildAnalysisPayload(payload: ReviewAnalyzeRequest): ReviewAnalyzeRequest {
  if (payload.reviews?.length || !payload.reviewText?.trim()) return payload

  return {
    ...payload,
    reviews: [payload.reviewText.trim()],
  }
}

function normalizeAnalysisResponse(data: BackendAnalysisData, payload: ReviewAnalyzeRequest): ReviewAnalyzeResponse {
  const result = data.result

  if (!result) {
    throw new Error(ANALYZE_ERROR_MESSAGE)
  }

  const evidence = normalizeEvidence(result.evidence)
  const fallbackGlobalAccessibilityChecks = buildGlobalAccessibilityChecks(payload)
  const globalAccessibilityChecks = normalizeGlobalAccessibilityChecks(
    result.globalAccessibilityChecks,
    fallbackGlobalAccessibilityChecks
  )
  const globalAccessibilityMaxScore =
    optionalNumber(result.globalAccessibilityMaxScore) ?? 100
  const adSuspicionScore = optionalNumber(result.adSuspicionScore) ?? optionalNumber(result.adScore) ?? 0
  const informationScore = optionalNumber(result.informationScore) ?? optionalNumber(result.placeScore) ?? 0
  const reviewInformationScore = optionalNumber(result.reviewInformationScore)
  const globalAccessibilityScore =
    optionalNumber(result.globalAccessibilityScore) ??
    optionalNumber(result.foreignerScore) ??
    calculateGlobalAccessibilityFallbackScore(globalAccessibilityChecks)
  const detectedPatterns = toStringArray(result.detectedPatterns)
  const suspiciousPhrases = toStringArray(result.suspiciousPhrases ?? evidence.suspiciousPhrases)
  const repetitivePhrases = toStringArray(result.repetitivePhrases ?? evidence.repetitivePhrases)

  return {
    analysisRequestId: data.analysisRequestId,
    analysisResultId: data.analysisResultId,
    hospitalId: data.hospitalId,
    reviewIds: data.reviewIds,
    totalScore: Number(result.totalScore ?? 0),
    trustScore: Number(result.trustScore ?? 0),
    adScore: adSuspicionScore,
    placeScore: informationScore,
    foreignerScore: globalAccessibilityScore,
    grade: typeof result.grade === "string" ? result.grade : undefined,
    trustGrade: typeof result.trustGrade === "string" ? result.trustGrade : String(result.trustLevelKey ?? ""),
    trustLevelKey: normalizeTrustLevel(result.trustLevelKey),
    adSuspicion: typeof result.adSuspicion === "string" ? result.adSuspicion : String(result.adSuspicionLevel ?? ""),
    adSuspicionScore,
    adSuspicionLevel: normalizeLevel(result.adSuspicionLevel),
    repetitionLevel: normalizeLevel(result.repetitionLevel),
    informationCompleteness: normalizeInformationCompleteness(result.informationLevel ?? result.informationCompleteness),
    informationScore,
    reviewInformationScore,
    reviewInformationLevel: typeof result.reviewInformationLevel === "string" ? result.reviewInformationLevel : undefined,
    positiveSignals: toStringArray(result.positiveSignals ?? evidence.positiveSignals),
    negativeSignals: toStringArray(result.negativeSignals),
    warningSignals: toStringArray(result.warningSignals ?? evidence.warnings),
    globalAccessibilityScore,
    globalAccessibilityLevel: typeof result.globalAccessibilityLevel === "string" ? result.globalAccessibilityLevel : "",
    globalAccessibilityMaxScore,
    globalAccessibilityChecks,
    detectedPatterns: detectedPatterns.length > 0 ? detectedPatterns : [...evidence.positiveSignals, ...evidence.warnings],
    suspiciousPhrases,
    repetitivePhrases,
    informationLevel: typeof result.informationLevel === "string" ? result.informationLevel : "",
    summary: typeof result.summary === "string" ? result.summary : "",
    recommendation: typeof result.recommendation === "string" ? result.recommendation : "",
    visitTip: typeof result.visitTip === "string" ? result.visitTip : "",
    evidence,
    analyzedReviewCount:
      optionalNumber(result.analyzedReviewCount) ??
      data.reviewIds?.length ??
      (Array.isArray(payload.reviews) ? payload.reviews.length : payload.reviewText ? 1 : 0),
    modelVersion: typeof result.modelVersion === "string" ? result.modelVersion : "",
  }
}

export const reviewAnalysisService = {
  async extractReviewTextFromImages(files: File[], language: "ko" | "en") {
    const formData = new FormData()
    files.forEach((file) => formData.append("images", file))
    formData.append("language", language)

    const response = await apiClient<ReviewOcrData>("/api/analysis/reviews/ocr", {
      method: "POST",
      auth: true,
      body: formData,
    })

    return {
      text: response.data.text ?? "",
      reviews: response.data.reviews ?? [],
      source: response.data.source,
      modelVersion: response.data.modelVersion,
    }
  },

  async analyzeReview(payload: ReviewAnalyzeRequest): Promise<ReviewAnalyzeResponse> {
    const analysisPayload = buildAnalysisPayload(payload)
    const response = await apiClient<BackendAnalysisData>("/api/analysis/analyze", {
      method: "POST",
      auth: true,
      body: analysisPayload,
    })

    if (!response.success) {
      throw new Error(ANALYZE_ERROR_MESSAGE)
    }

    return normalizeAnalysisResponse(response.data, analysisPayload)
  },
}
