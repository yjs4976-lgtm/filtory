"use client"

import Link from "next/link"
import { Bot } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ChatbotIconButton({ onClick, expanded }: { onClick?: () => void; expanded?: boolean }) {
  const { t } = useLanguage()
  const icon = <Bot className={styles.iconMd} aria-hidden="true" />

  if (onClick) {
    return <button type="button" className={styles.chatbotIconButton} aria-label={t.mypage.openChatbot} title={t.mypage.openChatbot} aria-expanded={expanded} onClick={onClick}>{icon}</button>
  }

  return (
    <Link href={ROUTES.CHATBOT} className={styles.chatbotIconButton} aria-label={t.mypage.openChatbot} title={t.mypage.openChatbot}>
      {icon}
    </Link>
  )
}
