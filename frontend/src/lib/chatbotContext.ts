import type { AnalysisHistoryItem, CurrentReviewAnalysis, HospitalCategory } from "./types"
import { ROUTES } from "./routes"

export const CHATBOT_CONTEXT_EVENT = "filtory-chatbot-context-change"

const SELECTED_CHATBOT_ANALYSIS_KEY = "filtory-selected-chatbot-analysis"

export type ChatbotAnalysisContext = {
  id?: string
  requestId?: string
  resultId?: string
  hospitalName: string
  hospitalNameKo?: string
  hospitalNameEn?: string
  hospitalEnglishName?: string
  englishName?: string
  category: HospitalCategory
  categoryKoLabel?: string
  categoryEnLabel?: string
  regionId?: string
  regionLabel?: string
  regionKoLabel?: string
  regionEnLabel?: string
  regionProvinceCode?: string
  regionDistrictCode?: string
  hospitalAddress?: string
  roadAddress?: string
  address?: string
  score?: number
  trustScore?: number
  trustLevel?: string
  trustLevelKey?: string
  trustGrade?: string
  summary?: string
  analysisDate?: string
  analyzedAt?: string
  foreignerFriendlyScore?: number
  foreignerScore?: number
  adSuspicionScore?: number
  adSuspicionLevel?: string
  adSuspicion?: string
  informationScore?: number
  informationLevel?: string
  infoCompletenessScore?: number
  globalAccessibilityScore?: number
  globalAccessibilityLevel?: string
  globalAccessRating?: number
  recommendation?: string
  visitTip?: string
  detectedPatterns?: string[]
  suspiciousPhrases?: string[]
  repetitivePhrases?: string[]
  positiveSignals?: string[]
  negativeSignals?: string[]
  modelVersion?: string
  source: "history" | "current"
}

export function getAnalysisResultId(item: AnalysisHistoryItem | CurrentReviewAnalysis | ChatbotAnalysisContext) {
  const record = item as unknown as Record<string, unknown>
  const value = record.analysisResultId ?? record.resultId ?? record.analysis_result_id
  const numericValue = Number(value)
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null
}

export function buildAnalysisChatbotHref(analysisResultId: number) {
  return `${ROUTES.CHATBOT}?from=analysis&analysisResultId=${analysisResultId}`
}

function numberFrom(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function stringArrayFrom(value: unknown) {
  return Array.isArray(value) ? value.map(String) : undefined
}

export function buildChatbotContextFromAnalysis(
  item: AnalysisHistoryItem | CurrentReviewAnalysis,
  source: ChatbotAnalysisContext["source"] = "history"
): ChatbotAnalysisContext {
  const record = item as unknown as Record<string, unknown>
  const analyzedAt = String(record.analyzedAt ?? record.createdAt ?? "")
  const id = String(record.id ?? record.analysisRequestId ?? "")
  const requestId = record.analysisRequestId === undefined ? id : String(record.analysisRequestId)
  const resultId = getAnalysisResultId(item) ?? undefined

  return {
    id,
    requestId,
    resultId: resultId === undefined ? undefined : String(resultId),
    hospitalName: String(record.hospitalName ?? ""),
    hospitalNameKo: record.hospitalNameKo ? String(record.hospitalNameKo) : undefined,
    hospitalNameEn: record.hospitalNameEn ? String(record.hospitalNameEn) : undefined,
    hospitalEnglishName: record.hospitalEnglishName ? String(record.hospitalEnglishName) : undefined,
    englishName: record.englishName ? String(record.englishName) : undefined,
    category: item.category,
    categoryKoLabel: record.categoryKoLabel ? String(record.categoryKoLabel) : undefined,
    categoryEnLabel: record.categoryEnLabel ? String(record.categoryEnLabel) : undefined,
    regionId: record.regionId ? String(record.regionId) : undefined,
    regionLabel: record.regionLabel ? String(record.regionLabel) : undefined,
    regionKoLabel: record.regionKoLabel ? String(record.regionKoLabel) : undefined,
    regionEnLabel: record.regionEnLabel ? String(record.regionEnLabel) : undefined,
    regionProvinceCode: record.regionProvinceCode ? String(record.regionProvinceCode) : undefined,
    regionDistrictCode: record.regionDistrictCode ? String(record.regionDistrictCode) : undefined,
    hospitalAddress: record.hospitalAddress ? String(record.hospitalAddress) : undefined,
    roadAddress: record.roadAddress ? String(record.roadAddress) : undefined,
    address: record.address ? String(record.address) : undefined,
    score: numberFrom(record.score ?? record.totalScore),
    trustScore: numberFrom(record.trustScore ?? record.score),
    trustLevel: record.trustLevel ? String(record.trustLevel) : undefined,
    trustLevelKey: record.trustLevelKey ? String(record.trustLevelKey) : undefined,
    trustGrade: record.trustGrade ? String(record.trustGrade) : undefined,
    summary: record.summary ? String(record.summary) : undefined,
    analysisDate: analyzedAt,
    analyzedAt,
    foreignerFriendlyScore: numberFrom(record.foreignerFriendlyScore ?? record.globalAccessibilityScore ?? record.foreignerScore),
    foreignerScore: numberFrom(record.foreignerScore ?? record.globalAccessibilityScore ?? record.foreignerFriendlyScore),
    adSuspicionScore: numberFrom(record.adSuspicionScore ?? record.adScore),
    adSuspicionLevel: record.adSuspicionLevel ? String(record.adSuspicionLevel) : undefined,
    adSuspicion: record.adSuspicion ? String(record.adSuspicion) : undefined,
    informationScore: numberFrom(record.informationScore ?? record.placeScore ?? record.infoCompletenessScore),
    informationLevel: record.informationLevel ? String(record.informationLevel) : undefined,
    infoCompletenessScore: numberFrom(record.infoCompletenessScore ?? record.informationScore ?? record.placeScore),
    globalAccessibilityScore: numberFrom(record.globalAccessibilityScore ?? record.foreignerScore ?? record.foreignerFriendlyScore),
    globalAccessibilityLevel: record.globalAccessibilityLevel ? String(record.globalAccessibilityLevel) : undefined,
    globalAccessRating: numberFrom(record.globalAccessRating ?? record.globalAccessibilityScore),
    recommendation: record.recommendation ? String(record.recommendation) : undefined,
    visitTip: record.visitTip ? String(record.visitTip) : undefined,
    detectedPatterns: stringArrayFrom(record.detectedPatterns ?? record.detectedReasons),
    suspiciousPhrases: stringArrayFrom(record.suspiciousPhrases),
    repetitivePhrases: stringArrayFrom(record.repetitivePhrases),
    positiveSignals: stringArrayFrom(record.positiveSignals),
    negativeSignals: stringArrayFrom(record.negativeSignals),
    modelVersion: record.modelVersion ? String(record.modelVersion) : undefined,
    source,
  }
}

export function readSelectedChatbotAnalysisContext(): ChatbotAnalysisContext | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(SELECTED_CHATBOT_ANALYSIS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as ChatbotAnalysisContext
    if (!parsed?.hospitalName || !parsed?.category) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSelectedChatbotAnalysisContext(context: ChatbotAnalysisContext) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SELECTED_CHATBOT_ANALYSIS_KEY, JSON.stringify(context))
  window.dispatchEvent(new Event(CHATBOT_CONTEXT_EVENT))
}

export function clearSelectedChatbotAnalysisContext() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SELECTED_CHATBOT_ANALYSIS_KEY)
  window.dispatchEvent(new Event(CHATBOT_CONTEXT_EVENT))
}
