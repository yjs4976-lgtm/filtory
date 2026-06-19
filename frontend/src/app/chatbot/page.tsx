"use client"

import { ChatWindow } from "@/components/chatbot/ChatWindow"
import { ChatbotHero } from "@/components/chatbot/ChatbotHero"
import { ResultContextCard } from "@/components/chatbot/ResultContextCard"
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
        <ChatbotHero />
        <ResultContextCard />
      </div>

      <div className={styles.chatWrap}>
        <ChatWindow />
      </div>

      <BottomNav />
    </div>
  )
}
