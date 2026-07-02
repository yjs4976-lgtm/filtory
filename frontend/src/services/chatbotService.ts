import { apiClient } from "./apiClient"

export type ChatbotMessagePayload = {
  message: string
  language?: "ko" | "en"
  analysisResultId?: number
  analysisContext?: unknown
}

export type ChatbotMessageResponse = {
  answer: string
  source: "analysis" | "keyword" | "small_talk" | "default" | "llm"
  suggested_questions: string[]
  modelVersion?: string
}

export function sendChatMessage(payload: ChatbotMessagePayload) {
  return apiClient<ChatbotMessageResponse>("/api/chatbot/message", {
    method: "POST",
    body: payload,
  })
}
