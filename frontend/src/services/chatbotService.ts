import { apiClient } from "./apiClient"

export type ChatbotMessagePayload = {
  message: string
  language?: "ko" | "en"
  analysisContext?: unknown
}

export type ChatbotMessageResponse = {
  answer: string
  source: "analysis" | "keyword" | "small_talk" | "default"
  suggested_questions: string[]
}

export function sendChatMessage(payload: ChatbotMessagePayload) {
  return apiClient<ChatbotMessageResponse>("/api/chatbot/message", {
    method: "POST",
    body: payload,
  })
}
