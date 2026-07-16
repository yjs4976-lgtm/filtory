export const CHATBOT_HISTORY_CHANGE_EVENT = "filtory-chatbot-history-change"

export type ChatbotHistoryChangeDetail = {
  type: "delete-one" | "delete-all"
  conversationId?: number
}

export function notifyChatbotConversationDeleted(conversationId: number) {
  dispatchChatbotHistoryChange({ type: "delete-one", conversationId })
}

export function notifyAllChatbotConversationsDeleted() {
  dispatchChatbotHistoryChange({ type: "delete-all" })
}

function dispatchChatbotHistoryChange(detail: ChatbotHistoryChangeDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<ChatbotHistoryChangeDetail>(CHATBOT_HISTORY_CHANGE_EVENT, { detail }))
}
