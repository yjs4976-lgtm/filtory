import type { AnalysisHistoryItem, CurrentReviewAnalysis, HospitalCategory } from "./types"

export const CHATBOT_CONTEXT_EVENT = "filtory-chatbot-context-change"

const SELECTED_CHATBOT_ANALYSIS_KEY = "filtory-selected-chatbot-analysis"

export type ChatbotAnalysisContext = {
  id?: string
  requestId?: string
  resultId?: string
  hospitalName: string
  category: HospitalCategory
  score?: number
  trustScore?: number
  trustLevel?: string
  trustLevelKey?: string
  summary?: string
  analysisDate?: string
  analyzedAt?: string
  foreignerFriendlyScore?: number
  foreignerScore?: number
  adSuspicionScore?: number
  adSuspicionLevel?: string
  adSuspicion?: string
  infoCompletenessScore?: number
  globalAccessRating?: number
  recommendation?: string
  detectedPatterns?: string[]
  suspiciousPhrases?: string[]
  repetitivePhrases?: string[]
  source: "history" | "current"
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
  const resultId = record.analysisResultId === undefined ? undefined : String(record.analysisResultId)

  return {
    id,
    requestId,
    resultId,
    hospitalName: String(record.hospitalName ?? ""),
    category: item.category,
    score: numberFrom(record.score ?? record.totalScore),
    trustScore: numberFrom(record.trustScore ?? record.score),
    trustLevel: record.trustLevel ? String(record.trustLevel) : undefined,
    trustLevelKey: record.trustLevelKey ? String(record.trustLevelKey) : undefined,
    summary: record.summary ? String(record.summary) : undefined,
    analysisDate: analyzedAt,
    analyzedAt,
    foreignerFriendlyScore: numberFrom(record.foreignerFriendlyScore ?? record.foreignerScore),
    foreignerScore: numberFrom(record.foreignerScore ?? record.foreignerFriendlyScore),
    adSuspicionScore: numberFrom(record.adSuspicionScore ?? record.adScore),
    adSuspicionLevel: record.adSuspicionLevel ? String(record.adSuspicionLevel) : undefined,
    adSuspicion: record.adSuspicion ? String(record.adSuspicion) : undefined,
    infoCompletenessScore: numberFrom(record.infoCompletenessScore ?? record.placeScore),
    globalAccessRating: numberFrom(record.globalAccessRating ?? record.globalAccessibilityScore),
    recommendation: record.recommendation ? String(record.recommendation) : undefined,
    detectedPatterns: stringArrayFrom(record.detectedPatterns ?? record.detectedReasons),
    suspiciousPhrases: stringArrayFrom(record.suspiciousPhrases),
    repetitivePhrases: stringArrayFrom(record.repetitivePhrases),
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
