import { apiClient } from "./apiClient"

export function sendChatMessage(message: string) {
  return apiClient("/chatbot/message", {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}
