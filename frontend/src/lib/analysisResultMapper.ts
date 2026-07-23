import { getGlobalAccessibilityCheckLabel } from "./displayLabels"
import { getHistoryHospitalName } from "./historyDisplay"
import type { HospitalCategory, Language, ReviewMentionedAspects, ReviewSignal } from "./types"

export type TrustResultKey = "very_safe" | "safe" | "normal" | "caution" | "danger"
export type AdSuspicionKey = "low" | "medium" | "high"
export type ConvenienceCheckStatus = "confirmed" | "notConfirmed" | "unknown"
export type ConvenienceQuestionStatus = "confirmed" | "partial" | "needsCheck" | "unknown"

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
    reviewTrustScore: number
    adSuspicionScore: number
    informationScore: number
    globalAccessibilityScore: number
    analyzedReviewCount: number
  }
  analysisConfidence: {
    key: "low" | "medium" | "high"
    label: string
    description: string
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
    checkedCount: number
    totalCount: number
    checks: {
      key: string
      label: string
      checked: boolean
    }[]
    checkItems: string[]
    description: string
  }
  globalAccessibility: {
    label: string
    readinessKey: "ready" | "needsCheck" | "unknown"
    score: number
    maxScore: number
    checkedCount: number
    totalCount: number
    description: string
    note: string
    visitGroup: {
      label: string
      checkedCount: number
      totalCount: number
    }
    englishGroup: {
      label: string
      checkedCount: number
      totalCount: number
    }
    questions: {
      key: "navigation" | "booking" | "english" | "preview"
      label: string
      description: string
      status: ConvenienceQuestionStatus
      statusLabel: string
    }[]
    checks: {
      key: string
      label: string
      checked: boolean
      status: ConvenienceCheckStatus
      group: "visit" | "english"
    }[]
  }
  reviewBurst: {
    status: "available" | "unavailable"
    score?: number
    description: string
  }
  scoreBreakdown: {
    evidenceScore: number
    riskScore: number
    specificityScore: number
    balanceScore: number
    diversityScore: number
    informativeScore: number
    naturalnessScore: number
    promoSignalScore: number
    repetitionScore: number
    exaggerationScore: number
    eventDiscountScore: number
    reviewBurstScore?: number
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
    specificitySignals: ReviewSignal[]
    promoSignals: ReviewSignal[]
    repetitionSignals: ReviewSignal[]
    exaggerationSignals: ReviewSignal[]
    balancedExperienceSignals: ReviewSignal[]
    mentionedAspects: Required<ReviewMentionedAspects>
  }
  meta: {
    modelVersion?: string
    isMockResult: boolean
  }
}

const GLOBAL_ACCESSIBILITY_KEYS = [
  "mapLocation",
  "contactBooking",
  "websitePlaceLink",
  "photoInfo",
  "englishName",
  "englishGuide",
  "englishReviews",
] as const

const GLOBAL_ACCESSIBILITY_GROUPS: Record<(typeof GLOBAL_ACCESSIBILITY_KEYS)[number], "visit" | "english"> = {
  mapLocation: "visit",
  contactBooking: "visit",
  websitePlaceLink: "visit",
  photoInfo: "visit",
  englishName: "english",
  englishGuide: "english",
  englishReviews: "english",
}

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
  if (value === "orthopedics" || value === "orthopedic" || value === "정형외과") return "orthopedics"
  return undefined
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function safeSignalArray(...values: unknown[]): ReviewSignal[] {
  const byPhrase = new Map<string, ReviewSignal>()
  for (const value of values) {
    if (!Array.isArray(value)) continue
    for (const item of value) {
      let signal: ReviewSignal | null = null
      if (isRecord(item)) {
        const phrase = stringValue(item.phrase)
        if (phrase) {
          signal = {
            type: stringValue(item.type),
            phrase,
            strength: stringValue(item.strength) || "medium",
            reason: stringValue(item.reason),
          }
        }
      } else {
        const phrase = String(item || "").trim()
        if (phrase) signal = { phrase, strength: "medium" }
      }
      if (signal && !byPhrase.has(signal.phrase)) byPhrase.set(signal.phrase, signal)
    }
  }
  return Array.from(byPhrase.values())
}

function normalizeMentionedAspects(...values: unknown[]): Required<ReviewMentionedAspects> {
  const merged: Required<ReviewMentionedAspects> = {
    costMentioned: false,
    waitingMentioned: false,
    treatmentProcessMentioned: false,
    aftercareMentioned: false,
  }
  for (const value of values) {
    if (!isRecord(value)) continue
    merged.costMentioned = merged.costMentioned || value.costMentioned === true
    merged.waitingMentioned = merged.waitingMentioned || value.waitingMentioned === true
    merged.treatmentProcessMentioned = merged.treatmentProcessMentioned || value.treatmentProcessMentioned === true
    merged.aftercareMentioned = merged.aftercareMentioned || value.aftercareMentioned === true
  }
  return merged
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
      very_safe: "신뢰 단서가 충분한 리뷰 흐름이에요",
      safe: "비교적 신뢰할 만한 리뷰 흐름이에요",
      normal: "추가 확인이 필요한 리뷰 흐름이에요",
      caution: "주의 깊게 확인할 리뷰 흐름이에요",
      danger: "리뷰만으로 판단하기 어려워요",
    },
    en: {
      very_safe: "This review pattern has enough trust signals.",
      safe: "This review pattern is relatively trustworthy.",
      normal: "This review pattern needs additional checking.",
      caution: "This review pattern should be checked carefully.",
      danger: "It is hard to judge from reviews alone.",
    },
  }
  const descriptions = {
    ko: {
      very_safe: "구체적인 경험 표현과 다양한 참고 단서가 충분히 확인됐어요.",
      safe: "구체적인 경험 표현이 확인됐고 광고 의심 신호는 제한적이에요.",
      normal: "구체적인 경험 표현은 확인됐지만, 반복적으로 보이는 표현이 있어요.",
      caution: "광고성 표현이나 반복 문구가 있어 리뷰 내용을 신중히 확인해보세요.",
      danger: "리뷰 수나 신뢰 단서가 부족해 병원 공식 정보와 함께 확인해야 해요.",
    },
    en: {
      very_safe: "Concrete visit details and varied reference signals were found.",
      safe: "Concrete experience details were found, with limited ad-like signals.",
      normal: "Some concrete details were found, but repeated expressions may be present.",
      caution: "Ad-like wording or repeated phrases may require careful review.",
      danger: "There are not enough review signals, so check official clinic information too.",
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
  if (score >= 90) return "very_safe"
  if (score >= 75) return "safe"
  if (score >= 60) return "normal"
  if (score >= 45) return "caution"
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

function normalizeConvenienceStatus(value: unknown): ConvenienceCheckStatus {
  if (value === "confirmed" || value === true) return "confirmed"
  if (value === "notConfirmed" || value === false) return "notConfirmed"
  return "unknown"
}

function convenienceValue(checks: Record<string, unknown>, key: (typeof GLOBAL_ACCESSIBILITY_KEYS)[number]) {
  if (key === "mapLocation") {
    return firstValue(checks.mapLocation, checks.googleMapLink, checks.googlePlaceId)
  }
  if (key === "contactBooking") {
    return firstValue(checks.contactBooking, checks.reservationLink)
  }
  if (key === "websitePlaceLink") {
    return firstValue(checks.websitePlaceLink, checks.homepageOrBookingLink)
  }
  return checks[key]
}

function normalizeChecks(value: unknown, language: Language) {
  const checks = isRecord(value) ? value : {}

  return GLOBAL_ACCESSIBILITY_KEYS.map((key) => {
    const status = normalizeConvenienceStatus(convenienceValue(checks, key))
    return {
      key,
      label: getGlobalAccessibilityCheckLabel(key, language),
      checked: status === "confirmed",
      status,
      group: GLOBAL_ACCESSIBILITY_GROUPS[key],
    }
  })
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

function hasMetadataSignal(...values: unknown[]) {
  return values.some((value) => {
    if (Array.isArray(value)) return value.some((item) => stringValue(item).length > 0)
    if (typeof value === "boolean") return value
    return stringValue(value).length > 0
  })
}

function informationChecks(language: Language, root: Record<string, unknown>, result: Record<string, unknown>) {
  const labels = {
    ko: [
      ["location", "주소 / 위치 정보"],
      ["treatment", "진료 분야 / 시술 정보"],
      ["phone", "연락처 정보"],
      ["booking", "예약 방법 / 링크"],
      ["homepage", "공식 홈페이지"],
      ["photos", "사진 정보"],
    ],
    en: [
      ["location", "Address / location"],
      ["treatment", "Care category / treatment info"],
      ["phone", "Contact information"],
      ["booking", "Booking method / link"],
      ["homepage", "Official website"],
      ["photos", "Photo information"],
    ],
  } as const
  const statusByKey = {
    location: hasMetadataSignal(
      root.hospitalAddress,
      root.address,
      root.roadAddress,
      root.regionLabel,
      root.mapUrl,
      root.googleMapUrl,
      root.google_map_url,
      root.naverPlaceUrl,
      root.naver_place_url,
      root.kakaoPlaceUrl,
      root.kakao_place_url,
      result.googleMapUrl,
      result.naverPlaceUrl,
      result.kakaoPlaceUrl
    ),
    treatment: hasMetadataSignal(
      root.treatmentItems,
      root.treatment_items,
      root.hospitalCategory,
      root.category,
      root.categoryKoLabel,
      result.treatmentItems
    ),
    phone: hasMetadataSignal(root.phone, result.phone),
    booking: hasMetadataSignal(
      root.reservationUrl,
      root.reservation_url,
      root.homepageUrl,
      root.homepage_url,
      root.naverPlaceUrl,
      root.kakaoPlaceUrl,
      result.homepageUrl,
      result.naverPlaceUrl,
      result.kakaoPlaceUrl
    ),
    homepage: hasMetadataSignal(root.homepageUrl, root.homepage_url, result.homepageUrl),
    photos: hasMetadataSignal(root.hasPhotos, root.hasGooglePhotos, root.imageUrl, result.hasPhotos, result.hasGooglePhotos),
  }
  return labels[language].map(([key, label]) => ({
    key,
    label,
    checked: Boolean(statusByKey[key]),
  }))
}

function analysisConfidenceLabel(key: "low" | "medium" | "high", language: Language) {
  const labels = {
    ko: { high: "높음", medium: "보통", low: "낮음" },
    en: { high: "High", medium: "Medium", low: "Low" },
  }
  return labels[language][key]
}

function normalizeConfidence(value: unknown): "low" | "medium" | "high" {
  const text = stringValue(value).toLowerCase()
  if (text === "high" || text === "높음") return "high"
  if (text === "low" || text === "낮음") return "low"
  return "medium"
}

function fallbackConfidenceDescription(key: "low" | "medium" | "high", language: Language) {
  if (language === "en") {
    if (key === "high") return "There are enough reviews and the wording is relatively varied."
    if (key === "medium") return "There are enough reviews, but some repeated or concentrated signals may exist."
    return "There are too few reviews or repeated expressions are relatively strong."
  }
  if (key === "high") return "분석 가능한 리뷰가 충분하고 표현도 비교적 다양해요."
  if (key === "medium") return "리뷰 수는 충분하지만, 일부 항목에서 반복/집중 신호가 있을 수 있어요."
  return "리뷰 수가 적거나 특정 표현이 과도하게 반복되어 신뢰도 해석에 주의가 필요해요."
}

function reviewBurstDescription(status: "available" | "unavailable", score: number | undefined, language: Language) {
  if (status === "unavailable") {
    return language === "ko"
      ? "리뷰 작성일 정보가 부족해 리뷰 집중도는 판단하지 않았어요."
      : "Review date information is limited, so review concentration was not judged."
  }
  if ((score ?? 0) >= 60) {
    return language === "ko"
      ? "특정 기간에 리뷰가 몰린 신호가 있어 함께 확인해보세요."
      : "Some reviews appear concentrated in a short period, so check this together."
  }
  return language === "ko"
    ? "리뷰 작성일 기준으로 과도한 집중 신호는 제한적이에요."
    : "Based on review dates, strong concentration signals are limited."
}

function foreignerVisitConvenienceNote(language: Language) {
  return language === "en"
    ? "This section summarizes how easy it is for foreign or non-Korean users to check essential visit information before visiting."
    : "이 항목은 외국인 또는 비한국어 사용자가 방문 전 필요한 정보를 쉽게 확인할 수 있는지를 정리한 참고 정보입니다."
}

function groupSummary(
  checks: ReturnType<typeof normalizeChecks>,
  group: "visit" | "english",
  language: Language
) {
  const groupChecks = checks.filter((item) => item.group === group)
  const labels = {
    ko: { visit: "방문 정보", english: "영어 지원" },
    en: { visit: "Visit information", english: "English support" },
  }
  return {
    label: labels[language][group],
    checkedCount: groupChecks.filter((item) => item.checked).length,
    totalCount: groupChecks.length,
  }
}

type NormalizedConvenienceCheck = ReturnType<typeof normalizeChecks>[number]
type ConvenienceReadinessKey = AnalysisResultViewModel["globalAccessibility"]["readinessKey"]

function findConvenienceCheck(checks: NormalizedConvenienceCheck[], key: string) {
  return checks.find((check) => check.key === key)
}

function hasCheckStatus(checks: NormalizedConvenienceCheck[], keys: string[], status: ConvenienceCheckStatus) {
  return keys.some((key) => findConvenienceCheck(checks, key)?.status === status)
}

function combineConvenienceStatus(checks: NormalizedConvenienceCheck[], keys: string[]): ConvenienceQuestionStatus {
  if (hasCheckStatus(checks, keys, "confirmed")) return "confirmed"
  if (hasCheckStatus(checks, keys, "notConfirmed")) return "needsCheck"
  return "unknown"
}

function convenienceQuestionStatusLabel(status: ConvenienceQuestionStatus, language: Language) {
  const labels: Record<Language, Record<ConvenienceQuestionStatus, string>> = {
    ko: {
      confirmed: "확인됨",
      partial: "일부 확인",
      needsCheck: "확인 필요",
      unknown: "판단 보류",
    },
    en: {
      confirmed: "Confirmed",
      partial: "Partially checked",
      needsCheck: "Needs checking",
      unknown: "Pending",
    },
  }
  return labels[language][status]
}

function convenienceQuestionDescription(key: string, status: ConvenienceQuestionStatus, language: Language) {
  const descriptions = {
    ko: {
      navigation: {
        confirmed: "위치 정보는 확인됐어요.",
        partial: "위치 단서가 일부 확인됐어요.",
        needsCheck: "찾아가는 방법은 방문 전에 확인해 주세요.",
        unknown: "주소나 지도 단서가 아직 부족해요.",
      },
      booking: {
        confirmed: "예약하거나 문의할 수 있는 단서가 있어요.",
        partial: "예약 또는 문의 단서가 일부 확인됐어요.",
        needsCheck: "예약 방법과 연락 가능 여부를 확인해 주세요.",
        unknown: "전화번호나 예약 링크 단서가 아직 부족해요.",
      },
      english: {
        confirmed: "영어 안내나 영어 응대 리뷰 단서가 확인됐어요.",
        partial: "영문 병원명은 확인됐지만 영어 응대 여부는 확인이 필요해요.",
        needsCheck: "영어 안내나 통역 가능 여부를 방문 전에 확인해 주세요.",
        unknown: "영어 안내 여부를 판단할 단서가 아직 부족해요.",
      },
      preview: {
        confirmed: "사진이나 영어 리뷰처럼 방문 전 참고할 단서가 있어요.",
        partial: "방문 전 참고 단서가 일부 확인됐어요.",
        needsCheck: "사진이나 최신 후기는 방문 전에 추가로 확인해 주세요.",
        unknown: "사진이나 외국인 리뷰 단서가 아직 부족해요.",
      },
    },
    en: {
      navigation: {
        confirmed: "Location information was found.",
        partial: "Some location signal was found.",
        needsCheck: "Check how to get there before visiting.",
        unknown: "Address or map signals are still limited.",
      },
      booking: {
        confirmed: "There is a way to contact or book the clinic.",
        partial: "Some contact or booking signal was found.",
        needsCheck: "Check booking and contact options before visiting.",
        unknown: "Phone or booking link signals are still limited.",
      },
      english: {
        confirmed: "English guidance or English-response review signals were found.",
        partial: "An English clinic name was found, but English support still needs checking.",
        needsCheck: "Check English guidance or interpretation availability before visiting.",
        unknown: "There is not enough signal to judge English support yet.",
      },
      preview: {
        confirmed: "Photos or English reviews are available as pre-visit references.",
        partial: "Some pre-visit reference signal was found.",
        needsCheck: "Check photos or recent reviews before visiting.",
        unknown: "Photo or foreign-language review signals are still limited.",
      },
    },
  } as const

  return descriptions[language][key as keyof typeof descriptions[typeof language]][status]
}

function buildConvenienceQuestions(checks: NormalizedConvenienceCheck[], language: Language): AnalysisResultViewModel["globalAccessibility"]["questions"] {
  const englishGuideConfirmed = findConvenienceCheck(checks, "englishGuide")?.status === "confirmed"
  const englishReviewsConfirmed = findConvenienceCheck(checks, "englishReviews")?.status === "confirmed"
  const englishNameConfirmed = findConvenienceCheck(checks, "englishName")?.status === "confirmed"
  const englishStatus: ConvenienceQuestionStatus =
    englishGuideConfirmed || englishReviewsConfirmed
      ? "confirmed"
      : englishNameConfirmed
        ? "partial"
        : hasCheckStatus(checks, ["englishGuide", "englishReviews"], "notConfirmed")
          ? "needsCheck"
          : "unknown"
  const contactBookingStatus = findConvenienceCheck(checks, "contactBooking")?.status
  const websitePlaceStatus = findConvenienceCheck(checks, "websitePlaceLink")?.status
  const bookingStatus: ConvenienceQuestionStatus =
    contactBookingStatus === "confirmed"
      ? "confirmed"
      : websitePlaceStatus === "confirmed"
        ? "partial"
        : contactBookingStatus === "notConfirmed" || websitePlaceStatus === "notConfirmed"
          ? "needsCheck"
          : "unknown"

  const definitions: {
    key: "navigation" | "booking" | "english" | "preview"
    label: Record<Language, string>
    status: ConvenienceQuestionStatus
  }[] = [
    {
      key: "navigation",
      label: { ko: "찾아가기 쉬운가요?", en: "Is it easy to get there?" },
      status: combineConvenienceStatus(checks, ["mapLocation"]),
    },
    {
      key: "booking",
      label: { ko: "예약하거나 문의할 수 있나요?", en: "Can users contact or book?" },
      status: bookingStatus,
    },
    {
      key: "english",
      label: { ko: "영어로 정보를 확인할 수 있나요?", en: "Can users check information in English?" },
      status: englishStatus,
    },
    {
      key: "preview",
      label: { ko: "방문 전에 병원을 미리 볼 수 있나요?", en: "Can users preview the clinic before visiting?" },
      status: combineConvenienceStatus(checks, ["photoInfo", "englishReviews"]),
    },
  ]

  return definitions.map((item) => ({
    key: item.key,
    label: item.label[language],
    status: item.status,
    statusLabel: convenienceQuestionStatusLabel(item.status, language),
    description: convenienceQuestionDescription(item.key, item.status, language),
  }))
}

function deriveConvenienceReadiness(
  questions: AnalysisResultViewModel["globalAccessibility"]["questions"],
  language: Language
) {
  const confirmedCount = questions.filter((item) => item.status === "confirmed").length
  const partialCount = questions.filter((item) => item.status === "partial").length
  const needsCheckCount = questions.filter((item) => item.status === "needsCheck").length

  const englishQuestion = questions.find((item) => item.key === "english")
  const hasConfirmedEnglishSupport = englishQuestion?.status === "confirmed"
  const hasAnyVisitSignal = confirmedCount + partialCount >= 1 || needsCheckCount >= 1

  const key: ConvenienceReadinessKey =
    confirmedCount >= 3 && hasConfirmedEnglishSupport
      ? "ready"
      : hasAnyVisitSignal
        ? "needsCheck"
        : "unknown"

  const labels = {
    ko: {
      ready: "외국인도 비교적 편하게 방문할 수 있어요",
      needsCheck: "방문 전 일부 확인이 필요해요",
      unknown: "정보가 부족해 판단하기 어려워요",
    },
    en: {
      ready: "The clinic looks relatively visit-ready for foreign users.",
      needsCheck: "Some details should be checked before visiting.",
      unknown: "There is not enough information to judge yet.",
    },
  } as const
  const descriptions = {
    ko: {
      ready: "위치, 예약, 영어 지원, 사진·후기 단서 중 여러 항목이 확인됐어요.",
      needsCheck: "확인된 단서가 있지만 예약 방법이나 영어 응대 여부는 방문 전에 다시 확인해 주세요.",
      unknown: "정보가 없는 것과 실제 방문이 어려운 것은 달라요. 병원이나 플레이스에서 최신 정보를 확인해 주세요.",
    },
    en: {
      ready: "Several signals across location, booking, English support, and photos/reviews were found.",
      needsCheck: "Some signals were found, but booking or English support should be checked before visiting.",
      unknown: "Missing information does not mean the visit will be difficult. Check the clinic or place page for current details.",
    },
  } as const

  return {
    key,
    label: labels[language][key],
    description: descriptions[language][key],
  }
}

function containsHangul(value: string) {
  return /[가-힣]/.test(value)
}

function localizeSignalText(value: string, language: Language, kind: "repetitive" | "suspicious" | "reference" | "positive" | "negative") {
  if (language === "ko" || !containsHangul(value)) return value

  const normalized = value.trim()
  const dictionary: Record<string, string> = {
    리뷰: "Review-related wording",
    프로필: "Profile-related wording",
    팔로우: "Follow-related wording",
    반응: "Reaction-related wording",
    남기기: "Posting or leaving a reaction",
    "반복적으로 보이는 표현이 있어 추가 확인이 필요합니다.": "Repeated wording was found, so additional checking may help.",
    "반복 표현 일부 확인": "Some repeated wording was found.",
    "광고성으로 보일 수 있는 표현 포함": "Some wording may look promotional.",
    "최신 리뷰와 병원 기본 정보를 함께 확인하는 것이 좋습니다.": "Check recent reviews and basic clinic information together.",
  }
  if (dictionary[normalized]) return dictionary[normalized]
  if (normalized.includes("반복")) return "Some repeated wording was found."
  if (normalized.includes("광고") || normalized.includes("홍보")) return "Some wording may look promotional."
  if (normalized.includes("확인") || normalized.includes("참고") || normalized.includes("방문 전")) {
    return "Additional checking before visiting may help."
  }
  if (kind === "repetitive") return "Repeated expression detected."
  if (kind === "suspicious") return "Potentially promotional expression detected."
  return "Additional review signal detected."
}

function localizeSignalList(values: string[], language: Language, kind: "repetitive" | "suspicious" | "reference" | "positive" | "negative") {
  return uniqueValues(values.map((value) => localizeSignalText(value, language, kind)))
}

function languageSafeText(value: string, language: Language, fallback: string) {
  // 영어 화면에 한글 LLM 문장이 섞이면 기본 안내문으로 대체해 UI 언어를 맞춘다.
  if (!value) return fallback
  if (language === "en" && containsHangul(value)) return fallback
  return value
}

export function normalizeAnalysisResult(input: unknown, options: { language?: Language } = {}): AnalysisResultViewModel {
  // 결과 화면은 API 응답, 저장된 히스토리, 로컬 mock 데이터를 모두 같은 ViewModel로 맞춰 그린다.
  const language = options.language ?? "ko"
  const { root, result } = normalizeInput(input)
  const evidence = pickRecord(result, "evidence")
  const evidenceJson = pickRecord(root, "evidence_json")
  const resultScoreBreakdown = {
    ...pickRecord(result, "score_breakdown"),
    ...pickRecord(result, "scoreBreakdown"),
  }
  const rootScoreBreakdown = {
    ...pickRecord(root, "score_breakdown"),
    ...pickRecord(root, "scoreBreakdown"),
  }
  const totalScore = scoreValue(result.totalScore, result.total_score, root.score, root.total_score, result.trustScore, root.trustScore)
  // reviewTrustScore를 화면의 신뢰도 기준으로 사용해 병원 정보 완성도와 섞이지 않게 한다.
  const reviewTrustScore = scoreValue(
    result.reviewTrustScore,
    result.review_trust_score,
    root.reviewTrustScore,
    root.review_trust_score,
    result.trustScore,
    result.trust_score,
    root.trustScore,
    root.trust_score,
    totalScore
  )
  const trustScore = reviewTrustScore
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
  const specificitySignals = safeSignalArray(result.specificitySignals, root.specificitySignals, evidenceJson.specificitySignals)
  const promoSignals = safeSignalArray(result.promoSignals, root.promoSignals, evidenceJson.promoSignals)
  const repetitionSignals = safeSignalArray(result.repetitionSignals, root.repetitionSignals, evidenceJson.repetitionSignals)
  const exaggerationSignals = safeSignalArray(result.exaggerationSignals, root.exaggerationSignals, evidenceJson.exaggerationSignals)
  const balancedExperienceSignals = safeSignalArray(
    result.balancedExperienceSignals,
    root.balancedExperienceSignals,
    evidenceJson.balancedExperienceSignals
  )
  const mentionedAspects = normalizeMentionedAspects(result.mentionedAspects, root.mentionedAspects, evidenceJson.mentionedAspects)
  const warningSignals = safeStringArray(result.warningSignals, evidence.warnings, evidenceJson.warnings)
  const detectedPatternSource = safeStringArray(result.detectedPatterns, root.detectedPatterns, root.detectedReasons)
  const referenceWarnings = localizeSignalList(
    uniqueValues([...warningSignals, ...detectedPatternSource].filter(isReferenceWarning)),
    language,
    "reference"
  )
  const detectedPatterns = localizeSignalList(
    detectedPatternSource.filter((item) => !isReferenceWarning(item)),
    language,
    "reference"
  )
  const suspiciousPhrases = localizeSignalList(safeStringArray(result.suspiciousPhrases, evidence.suspiciousPhrases, root.suspiciousPhrases).filter(
    (item) => !isReferenceWarning(item)
  ), language, "suspicious")
  const repetitivePhrases = localizeSignalList(safeStringArray(result.repetitivePhrases, evidence.repetitivePhrases, root.repetitivePhrases).filter(
    (item) => !isReferenceWarning(item)
  ), language, "repetitive")
  const adKey = deriveAdSuspicionKey(adSuspicionScore, firstValue(result.adSuspicion, result.adSuspicionLevel, root.adSuspicionLevel))
  const maxScore = normalizeScoreMax(
    globalAccessibilityScore,
    optionalNumber(firstValue(result.globalAccessibilityMaxScore, root.globalAccessibilityMaxScore))
  )
  const summary = stringValue(result.summary) || stringValue(root.summary)
  const recommendation = stringValue(result.recommendation) || stringValue(root.recommendation)
  const visitTip = stringValue(result.visitTip) || stringValue(evidenceJson.visitTip)
  const fallbackSummary = language === "ko"
    ? "아직 요약할 수 있는 리뷰 내용이 충분하지 않아요."
    : "There is not enough review content to summarize yet."
  const fallbackRecommendation = language === "ko"
    ? "분석 결과는 참고 정보로 활용하고, 방문 전 최신 리뷰와 병원 안내를 함께 확인해 주세요."
    : "Use this result as reference information and check recent reviews plus clinic guidance before visiting."
  const fallbackVisitTip = language === "ko"
    ? "방문 전 진료 항목, 비용 안내, 예약 필요 여부를 병원에 확인해 보세요."
    : "Before visiting, confirm treatments, costs, and booking requirements with the clinic."
  const confidenceKey = normalizeConfidence(firstValue(result.analysisConfidence, root.analysisConfidence))
  const confidenceDescription =
    stringValue(firstValue(result.analysisConfidenceDescription, root.analysisConfidenceDescription)) ||
    fallbackConfidenceDescription(confidenceKey, language)
  const informationCheckItems = informationChecks(language, root, result)
  const globalAccessibilityChecks = normalizeChecks(firstValue(result.globalAccessibilityChecks, root.globalAccessibilityChecks), language)
  // 외국인 방문 준비도는 7개 원천 항목을 4개 사용자 질문으로 묶어 결과 화면을 짧게 보여준다.
  const visitAccessibilityGroup = groupSummary(globalAccessibilityChecks, "visit", language)
  const englishAccessibilityGroup = groupSummary(globalAccessibilityChecks, "english", language)
  const globalAccessibilityQuestions = buildConvenienceQuestions(globalAccessibilityChecks, language)
  const globalAccessibilityReadiness = deriveConvenienceReadiness(globalAccessibilityQuestions, language)
  const reviewBurstScore = optionalNumber(firstValue(
    result.reviewBurstScore,
    result.review_burst_score,
    resultScoreBreakdown.reviewBurstScore,
    resultScoreBreakdown.review_burst_score,
    root.reviewBurstScore,
    root.review_burst_score,
    rootScoreBreakdown.reviewBurstScore,
    rootScoreBreakdown.review_burst_score
  ))
  const reviewBurstStatus =
    stringValue(firstValue(result.reviewBurstStatus, root.reviewBurstStatus)) === "available" || reviewBurstScore !== undefined
      ? "available"
      : "unavailable"

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
      reviewTrustScore,
      adSuspicionScore,
      informationScore,
      globalAccessibilityScore,
      analyzedReviewCount,
    },
    analysisConfidence: {
      key: confidenceKey,
      label: analysisConfidenceLabel(confidenceKey, language),
      description: confidenceDescription,
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
      checkedCount: informationCheckItems.filter((item) => item.checked).length,
      totalCount: informationCheckItems.length,
      checks: informationCheckItems,
      checkItems: localizeSignalList(safeStringArray(evidence.checkItems, evidenceJson.checkItems), language, "positive"),
      description: informationDescription(informationScore, language),
    },
    globalAccessibility: {
      label: globalAccessibilityReadiness.label,
      readinessKey: globalAccessibilityReadiness.key,
      score: globalAccessibilityScore,
      maxScore,
      checkedCount: globalAccessibilityChecks.filter((item) => item.checked).length,
      totalCount: globalAccessibilityChecks.length,
      description: globalAccessibilityReadiness.description,
      note: foreignerVisitConvenienceNote(language),
      visitGroup: visitAccessibilityGroup,
      englishGroup: englishAccessibilityGroup,
      questions: globalAccessibilityQuestions,
      checks: globalAccessibilityChecks,
    },
    reviewBurst: {
      status: reviewBurstStatus,
      score: reviewBurstScore,
      description: reviewBurstDescription(reviewBurstStatus, reviewBurstScore, language),
    },
    scoreBreakdown: {
      evidenceScore: scoreValue(result.evidenceScore, result.evidence_score, resultScoreBreakdown.evidenceScore, resultScoreBreakdown.evidence_score, root.evidenceScore, root.evidence_score, rootScoreBreakdown.evidenceScore, rootScoreBreakdown.evidence_score),
      riskScore: scoreValue(result.riskScore, result.risk_score, resultScoreBreakdown.riskScore, resultScoreBreakdown.risk_score, root.riskScore, root.risk_score, rootScoreBreakdown.riskScore, rootScoreBreakdown.risk_score, adSuspicionScore),
      specificityScore: scoreValue(result.specificityScore, result.specificity_score, resultScoreBreakdown.specificityScore, resultScoreBreakdown.specificity_score, root.specificityScore, root.specificity_score, rootScoreBreakdown.specificityScore, rootScoreBreakdown.specificity_score),
      balanceScore: scoreValue(result.balanceScore, result.balance_score, resultScoreBreakdown.balanceScore, resultScoreBreakdown.balance_score, root.balanceScore, root.balance_score, rootScoreBreakdown.balanceScore, rootScoreBreakdown.balance_score),
      diversityScore: scoreValue(result.diversityScore, result.diversity_score, resultScoreBreakdown.diversityScore, resultScoreBreakdown.diversity_score, root.diversityScore, root.diversity_score, rootScoreBreakdown.diversityScore, rootScoreBreakdown.diversity_score),
      informativeScore: scoreValue(result.informativeScore, result.informative_score, resultScoreBreakdown.informativeScore, resultScoreBreakdown.informative_score, root.informativeScore, root.informative_score, rootScoreBreakdown.informativeScore, rootScoreBreakdown.informative_score, informationScore),
      naturalnessScore: scoreValue(result.naturalnessScore, result.naturalness_score, resultScoreBreakdown.naturalnessScore, resultScoreBreakdown.naturalness_score, root.naturalnessScore, root.naturalness_score, rootScoreBreakdown.naturalnessScore, rootScoreBreakdown.naturalness_score),
      promoSignalScore: scoreValue(result.promoSignalScore, result.promo_signal_score, resultScoreBreakdown.promoSignalScore, resultScoreBreakdown.promo_signal_score, root.promoSignalScore, root.promo_signal_score, rootScoreBreakdown.promoSignalScore, rootScoreBreakdown.promo_signal_score),
      repetitionScore: scoreValue(result.repetitionScore, result.repetition_score, resultScoreBreakdown.repetitionScore, resultScoreBreakdown.repetition_score, root.repetitionScore, root.repetition_score, rootScoreBreakdown.repetitionScore, rootScoreBreakdown.repetition_score),
      exaggerationScore: scoreValue(result.exaggerationScore, result.exaggeration_score, resultScoreBreakdown.exaggerationScore, resultScoreBreakdown.exaggeration_score, root.exaggerationScore, root.exaggeration_score, rootScoreBreakdown.exaggerationScore, rootScoreBreakdown.exaggeration_score),
      eventDiscountScore: scoreValue(result.eventDiscountScore, result.event_discount_score, resultScoreBreakdown.eventDiscountScore, resultScoreBreakdown.event_discount_score, root.eventDiscountScore, root.event_discount_score, rootScoreBreakdown.eventDiscountScore, rootScoreBreakdown.event_discount_score),
      reviewBurstScore,
    },
    content: {
      summary: languageSafeText(summary, language, fallbackSummary),
      recommendation: languageSafeText(recommendation, language, fallbackRecommendation),
      visitTip: languageSafeText(visitTip, language, fallbackVisitTip),
    },
    signals: {
      positiveSignals: localizeSignalList(safeStringArray(result.positiveSignals, evidence.positiveSignals, root.positiveSignals), language, "positive"),
      negativeSignals: localizeSignalList(safeStringArray(result.negativeSignals, root.negativeSignals), language, "negative"),
      warningSignals: localizeSignalList(warningSignals, language, "reference"),
      specificPhrases: localizeSignalList(safeStringArray(evidence.specificPhrases), language, "positive"),
      specificitySignals,
      promoSignals,
      repetitionSignals,
      exaggerationSignals,
      balancedExperienceSignals,
      mentionedAspects,
    },
    meta: {
      modelVersion: stringValue(firstValue(result.modelVersion, root.modelVersion)),
      isMockResult: stringValue(firstValue(result.modelVersion, root.modelVersion)).includes("mock"),
    },
  }
}
