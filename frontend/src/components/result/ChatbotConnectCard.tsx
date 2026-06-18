"use client"

import { useRouter } from "next/navigation"
import { Bot } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ChatbotConnectCard() {
  const router = useRouter()

  return (
    <section className={`${styles.accentCard} ${styles.rowBetween}`}>
      <div className={styles.row}>
        <span className={styles.chatIntroIcon}>
          <Bot className={styles.iconMd} />
        </span>
        <div>
          <h2 className={styles.titleSm}>결과가 어렵게 느껴지나요?</h2>
          <p className={styles.mutedText}>챗봇에게 결과를 쉽게 설명해달라고 물어보세요.</p>
        </div>
      </div>
      <button type="button" className={styles.smallPillButton} onClick={() => router.push(ROUTES.CHATBOT)}>
        질문하기
      </button>
    </section>
  )
}
