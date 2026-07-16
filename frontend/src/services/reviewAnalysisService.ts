import type { ReviewAnalyzeRequest, ReviewAnalyzeResponse, ReviewMentionedAspects, ReviewSignal } from "@/lib/types"
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
  "mapLocation",
  "contactBooking",
  "websitePlaceLink",
  "photoInfo",
  "englishName",
  "englishGuide",
  "englishReviews",
]

// backend-ai, backend-main, 예전 로컬 mock에서 쓰던 key가 조금씩 달라서 한 곳에서 호환한다.
const GLOBAL_ACCESSIBILITY_CHECK_ALIASES: Record<GlobalAccessibilityCheckKey, string[]> = {
  mapLocation: [
    "mapLocation",
    "googleMapLink",
    "googlePlaceId",
    "googleMapUrl",
    "google_map_url",
    "googleRegistered",
    "google_registered",
    "address",
    "roadAddress",
    "road_address",
  ],
  contactBooking: ["contactBooking", "phone", "reservationLink", "hasReservationLink", "has_reservation_link"],
  websitePlaceLink: [
    "websitePlaceLink",
    "homepageOrBookingLink",
    "homepageUrl",
    "homepage_url",
    "naverPlaceUrl",
    "naver_place_url",
    "kakaoPlaceUrl",
    "kakao_place_url",
  ],
  photoInfo: ["photoInfo", "hasGooglePhotos", "has_google_photos", "hasPhotos", "has_photos"],
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
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function toReviewSignalArray(value: unknown): ReviewSignal[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const signal = item as Record<string, unknown>
      const phrase = typeof signal.phrase === "string" ? signal.phrase.trim() : ""
      if (!phrase) return []
      return [{
        type: typeof signal.type === "string" ? signal.type : undefined,
        phrase,
        strength: typeof signal.strength === "string" ? signal.strength : "medium",
        reason: typeof signal.reason === "string" ? signal.reason : undefined,
      }]
    }

    const phrase = String(item || "").trim()
    return phrase ? [{ phrase, strength: "medium" }] : []
  })
}

function normalizeMentionedAspects(value: unknown): ReviewMentionedAspects | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  return {
    costMentioned: source.costMentioned === true,
    waitingMentioned: source.waitingMentioned === true,
    treatmentProcessMentioned: source.treatmentProcessMentioned === true,
    aftercareMentioned: source.aftercareMentioned === true,
  }
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

function hasContextValue(value: unknown) {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  return true
}

function checkStatus(value: unknown, hasContext: boolean): "confirmed" | "notConfirmed" | "unknown" {
  if (typeof value === "boolean") return value ? "confirmed" : hasContext ? "notConfirmed" : "unknown"
  if (hasContextValue(value)) return "confirmed"
  return hasContext ? "notConfirmed" : "unknown"
}

function englishGuidanceStatusFromText(value?: string): boolean | undefined {
  const text = value?.trim().toLowerCase()
  if (!text) return undefined

  // "영어 안내 없음" 같은 부정 문장을 영어 지원 확인으로 오탐하지 않도록 먼저 제외한다.
  const negativePatterns = [
    /영어.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)/,
    /통역.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)/,
    /외국인.{0,8}(불가|안\s*됨|진료\s*안|받지\s*않)/,
    /(no|not|without).{0,32}(english|interpreter|translation|foreigner)/,
    /(english|interpreter|translation|foreigner).{0,32}(not\s+available|unavailable|unsupported|not\s+supported|no\s+support)/,
  ]

  if (negativePatterns.some((pattern) => pattern.test(text))) {
    return false
  }

  return /english|영어 안내|외국어|통역|foreigner|international|multilingual|interpreter|translation|외국인 진료|외국어 안내/i.test(text)
    ? true
    : undefined
}

function hasEnglishGuidanceContext(value?: string) {
  const text = value?.trim().toLowerCase()
  if (!text) return false

  return /english|영어 안내|외국어|통역|foreigner|international|multilingual|interpreter|translation|외국인 진료|외국어 안내|영어.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)|통역.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)|외국인.{0,8}(불가|안\s*됨|진료\s*안|받지\s*않)|(no|not|without).{0,32}(english|interpreter|translation|foreigner)|(english|interpreter|translation|foreigner).{0,32}(not\s+available|unavailable|unsupported|not\s+supported|no\s+support)/i.test(text)
}

function buildGlobalAccessibilityChecks(payload: ReviewAnalyzeRequest) {
  // 서버 응답이 없거나 mock fallback을 쓸 때도 병원 메타데이터와 리뷰 텍스트로 방문 준비도 항목을 보정한다.
  const placeLink = payload.homepageUrl || payload.naverPlaceUrl || payload.kakaoPlaceUrl || payload.googleMapUrl
  const reviewText = [payload.reviewText, ...(payload.reviews ?? [])]
    .filter((item): item is string => Boolean(item?.trim()))
    .join("\n")
  const mapSignal =
    payload.address ||
    payload.roadAddress ||
    payload.googleMapUrl ||
    payload.googleRegistered ||
    payload.naverPlaceUrl ||
    payload.kakaoPlaceUrl ||
    payload.googlePlaceId
  const mapContextExists = [
    payload.address,
    payload.roadAddress,
    payload.googleMapUrl,
    payload.googleRegistered,
    payload.naverPlaceUrl,
    payload.kakaoPlaceUrl,
    payload.googlePlaceId,
  ].some(hasContextValue)
  const photoInfo = payload.hasGooglePhotos || payload.hasPhotos
  const englishGuide =
    payload.hasEnglishInfo ?? englishGuidanceStatusFromText(payload.description) ?? englishGuidanceStatusFromText(reviewText)
  const englishReviews = payload.englishReviews ?? payload.hasEnglishReviews
  const englishGuideContextExists =
    payload.hasEnglishInfo !== undefined || hasContextValue(payload.description) || hasEnglishGuidanceContext(reviewText)

  return {
    mapLocation: checkStatus(mapSignal, mapContextExists),
    contactBooking: checkStatus(payload.phone || payload.homepageUrl, Boolean(payload.phone || placeLink)),
    websitePlaceLink: checkStatus(placeLink, Boolean(placeLink || payload.sourceProvider)),
    photoInfo: checkStatus(photoInfo, payload.hasGooglePhotos !== undefined || payload.hasPhotos !== undefined),
    englishName: checkStatus(payload.englishName, payload.englishName !== undefined),
    englishGuide: checkStatus(englishGuide, englishGuideContextExists),
    englishReviews: checkStatus(englishReviews, payload.englishReviews !== undefined || payload.hasEnglishReviews !== undefined),
  }
}

function calculateGlobalAccessibilityFallbackScore(values: GlobalAccessibilityChecks) {
  // 외국인 방문 준비도 점수는 표시용 보조 점수이며, 리뷰 신뢰도 점수와는 분리한다.
  const weights: Record<keyof GlobalAccessibilityChecks, number> = {
    mapLocation: 25,
    contactBooking: 20,
    englishGuide: 20,
    englishName: 10,
    websitePlaceLink: 10,
    photoInfo: 10,
    englishReviews: 5,
    googleMapLink: 0,
    googlePlaceId: 0,
    homepageOrBookingLink: 0,
  }

  return Object.entries(weights).reduce((score, [key, weight]) => {
    return score + (values[key as keyof GlobalAccessibilityChecks] === "confirmed" || values[key as keyof GlobalAccessibilityChecks] === true ? weight : 0)
  }, 0)
}

function toStatus(value: unknown): "confirmed" | "notConfirmed" | "unknown" | undefined {
  if (value === "confirmed" || value === "notConfirmed" || value === "unknown") return value
  if (typeof value === "boolean") return value ? "confirmed" : "notConfirmed"
  if (typeof value === "number") return value > 0 ? "confirmed" : "notConfirmed"
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "y"].includes(normalized)) return "confirmed"
    if (["false", "0", "no", "n"].includes(normalized)) return "notConfirmed"
    if (normalized === "unknown" || normalized === "") return "unknown"
  }
  return undefined
}

function getAliasedStatus(source: Record<string, unknown>, key: GlobalAccessibilityCheckKey) {
  for (const alias of GLOBAL_ACCESSIBILITY_CHECK_ALIASES[key]) {
    const value = toStatus(source[alias])
    if (value !== undefined) return value
  }

  return undefined
}

function optionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizeApiGlobalAccessibilityChecks(value: unknown) {
  if (!value || typeof value !== "object") return null

  const source = value as Record<string, unknown>
  const checks: Partial<GlobalAccessibilityChecks> = {}
  let hasAnyCheck = false

  for (const key of GLOBAL_ACCESSIBILITY_DISPLAY_KEYS) {
    const checkValue = getAliasedStatus(source, key)
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
    checks[key] = normalizedApiChecks?.[key] ?? fallbackChecks[key] ?? "unknown"
    return checks
  }, {})
}

function buildAnalysisPayload(payload: ReviewAnalyzeRequest): ReviewAnalyzeRequest {
  const reviews = (payload.reviews ?? []).map((review) => review.trim()).filter(Boolean)
  if (reviews.length > 0) {
    // reviews 배열이 있으면 합쳐진 reviewText를 보내지 않아 backend-main/backend-ai에서 중복 1건으로 세지 않게 한다.
    return {
      ...payload,
      reviewText: undefined,
      reviews,
    }
  }

  if (!payload.reviewText?.trim()) return payload

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
  const reviewTrustScore = optionalNumber(result.reviewTrustScore) ?? optionalNumber(result.trustScore) ?? 0
  const reviewBurstScore = optionalNumber(result.reviewBurstScore)

  return {
    analysisRequestId: data.analysisRequestId,
    analysisResultId: data.analysisResultId,
    hospitalId: data.hospitalId,
    reviewIds: data.reviewIds,
    totalScore: Number(result.totalScore ?? 0),
    trustScore: reviewTrustScore,
    reviewTrustScore,
    evidenceScore: optionalNumber(result.evidenceScore),
    riskScore: optionalNumber(result.riskScore),
    specificityScore: optionalNumber(result.specificityScore),
    balanceScore: optionalNumber(result.balanceScore),
    diversityScore: optionalNumber(result.diversityScore),
    informativeScore: optionalNumber(result.informativeScore),
    naturalnessScore: optionalNumber(result.naturalnessScore),
    promoSignalScore: optionalNumber(result.promoSignalScore),
    repetitionScore: optionalNumber(result.repetitionScore),
    exaggerationScore: optionalNumber(result.exaggerationScore),
    eventDiscountScore: optionalNumber(result.eventDiscountScore),
    reviewBurstScore: reviewBurstScore ?? null,
    reviewBurstStatus: typeof result.reviewBurstStatus === "string" ? result.reviewBurstStatus : reviewBurstScore === undefined ? "unavailable" : "available",
    analysisConfidence: typeof result.analysisConfidence === "string" ? result.analysisConfidence : undefined,
    analysisConfidenceDescription:
      typeof result.analysisConfidenceDescription === "string" ? result.analysisConfidenceDescription : undefined,
    scoreBreakdown:
      result.scoreBreakdown && typeof result.scoreBreakdown === "object"
        ? result.scoreBreakdown as Record<string, number | string | boolean | null | undefined>
        : undefined,
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
    specificitySignals: toReviewSignalArray(result.specificitySignals),
    promoSignals: toReviewSignalArray(result.promoSignals),
    repetitionSignals: toReviewSignalArray(result.repetitionSignals),
    exaggerationSignals: toReviewSignalArray(result.exaggerationSignals),
    balancedExperienceSignals: toReviewSignalArray(result.balancedExperienceSignals),
    mentionedAspects: normalizeMentionedAspects(result.mentionedAspects),
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
