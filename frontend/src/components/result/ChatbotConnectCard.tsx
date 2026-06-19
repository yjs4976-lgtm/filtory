"use client"

import { useRouter } from "next/navigation"
import { Bot } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ChatbotConnectCard() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <section className={`${styles.accentCard} ${styles.rowBetween}`}>
      <div className={styles.row}>
        <span className={styles.chatIntroIcon}>
          <Bot className={styles.iconMd} />
        </span>
        <div>
          <h2 className={styles.titleSm}>{t.result.chatbotQuestionTitle}</h2>
          <p className={styles.mutedText}>{t.result.chatbotQuestionDescription}</p>
        </div>
      </div>
      <button type="button" className={styles.smallPillButton} onClick={() => router.push(ROUTES.CHATBOT)}>
        {t.result.askQuestion}
      </button>
    </section>
  )
}
