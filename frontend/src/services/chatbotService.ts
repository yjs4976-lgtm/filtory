import { apiClient } from "./apiClient"

export type ChatbotMessagePayload = {
  message: string
  language?: "ko" | "en"
  analysisResultId?: number
  analysisContext?: unknown
  conversationId?: number
}

export type ChatbotMessageResponse = {
  answer: string
  source: "analysis" | "keyword" | "small_talk" | "default" | "llm"
  suggested_questions: string[]
  modelVersion?: string
  conversationId?: number
}

export type ChatbotConversationMessage = {
  id: number
  conversationId: number
  role: "user" | "assistant"
  content: string
  source?: string
  modelVersion?: string
  createdAt?: string
}

export type ChatbotConversation = {
  id: number
  analysisResultId?: number
  title: string
  language: "ko" | "en" | string
  lastMessagePreview?: string
  messageCount: number
  createdAt?: string
  updatedAt?: string
  messages?: ChatbotConversationMessage[]
}

export function sendChatMessage(payload: ChatbotMessagePayload) {
  return apiClient<ChatbotMessageResponse>("/api/chatbot/message", {
    method: "POST",
    body: payload,
  })
}

export function listChatbotConversations(size = 10) {
  return apiClient<ChatbotConversation[]>(`/api/chatbot/conversations?per_page=${size}`, {
    auth: true,
  })
}

export function getChatbotConversation(conversationId: number) {
  return apiClient<ChatbotConversation>(`/api/chatbot/conversations/${conversationId}`, {
    auth: true,
  })
}

export function deleteChatbotConversation(conversationId: number) {
  return apiClient<{ deleted: number }>(`/api/chatbot/conversations/${conversationId}`, {
    method: "DELETE",
    auth: true,
  })
}

export function deleteAllChatbotConversations() {
  return apiClient<{ deleted: number }>("/api/chatbot/conversations", {
    method: "DELETE",
    auth: true,
  })
}
