"use client"

import { ChatbotIconButton } from "@/components/common/ChatbotIconButton"
import styles from "@/styles/App.module.css"

export function AiRecommendationCard({ onOpen, isOpen }: { onOpen: () => void; isOpen: boolean }) {
  return (
    <div className={styles.chatbotShortcutRow}>
      <ChatbotIconButton onClick={onOpen} expanded={isOpen} />
    </div>
  )
}
