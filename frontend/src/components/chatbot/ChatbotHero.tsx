"use client"

import { Bot } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ChatbotHero() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.accentCard} ${styles.chatIntro}`}>
      <span className={styles.chatIntroIcon}>
        <Bot className={styles.iconLg} />
      </span>
      <div>
        <p className={styles.titleSm}>{t.chatbot.brand}</p>
        <p className={styles.mutedText}>{t.chatbot.heroDescription}</p>
      </div>
    </section>
  )
}
