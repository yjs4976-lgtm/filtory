"use client"

import { useRouter } from "next/navigation"
import { Bot } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { buildAnalysisChatbotHref } from "@/lib/chatbotContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

type ChatbotConnectCardProps = {
  analysisResultId?: number
}

export function ChatbotConnectCard({ analysisResultId }: ChatbotConnectCardProps) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const canConnect = Number.isInteger(analysisResultId) && Number(analysisResultId) > 0
  const disabledMessage =
    language === "ko"
      ? "이 분석 결과를 챗봇에 연결하려면 분석 결과 ID가 필요해요."
      : "An analysis result ID is required to connect this result to the chatbot."

  return (
    <section className={`${styles.accentCard} ${styles.rowBetween}`}>
      <div className={styles.row}>
        <span className={styles.chatIntroIcon}>
          <Bot className={styles.iconMd} />
        </span>
        <div>
          <h2 className={styles.titleSm}>{t.result.chatbotQuestionTitle}</h2>
          <p className={styles.mutedText}>{t.result.chatbotQuestionDescription}</p>
          {!canConnect && <p className={styles.searchHint}>{disabledMessage}</p>}
        </div>
      </div>
      <button
        type="button"
        className={styles.smallPillButton}
        disabled={!canConnect}
        onClick={() => router.push(canConnect ? buildAnalysisChatbotHref(Number(analysisResultId)) : ROUTES.CHATBOT)}
      >
        {t.chatbot.askWithResult}
      </button>
    </section>
  )
}
