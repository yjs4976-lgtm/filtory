"use client"

import { Bot } from "lucide-react"
import { ChatWindow } from "@/components/chatbot/ChatWindow"
import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function ChatbotPage() {
  const { t } = useLanguage()

  return (
    <div className={styles.chatPage}>
      <Header title={t.chatbot.title} showBack />

      <div className={styles.chatIntroWrap}>
        <div className={`${styles.accentCard} ${styles.chatIntro}`}>
          <span className={styles.chatIntroIcon}>
            <Bot className={styles.iconLg} />
          </span>
          <div>
            <p className={styles.titleSm}>Filtory AI</p>
            <p className={styles.mutedText}>{t.chatbot.greeting}</p>
          </div>
        </div>
      </div>

      <div className={styles.chatWrap}>
        <ChatWindow />
      </div>

      <BottomNav />
    </div>
  )
}
