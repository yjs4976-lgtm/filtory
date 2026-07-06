"use client"

import { EmptyState } from "@/components/common/EmptyState"
import { useLanguage } from "@/context/LanguageContext"

export function ChatbotEmptyState() {
  const { t } = useLanguage()

  return (
    <EmptyState
      title={t.chatbot.emptyTitle}
      description={t.chatbot.emptyDescription}
    />
  )
}
