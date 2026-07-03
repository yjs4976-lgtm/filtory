"use client"

import { useRouter } from "next/navigation"
import { Bot } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import {
  buildAnalysisChatbotHref,
  buildChatbotContextFromAnalysis,
  writeSelectedChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { ROUTES } from "@/lib/routes"
import { useAuth } from "@/hooks/useAuth"
import type { CurrentReviewAnalysis } from "@/lib/types"
import styles from "@/styles/App.module.css"

type ChatbotConnectCardProps = {
  analysisResultId?: number
  analysisResult?: CurrentReviewAnalysis
}

export function ChatbotConnectCard({ analysisResultId, analysisResult }: ChatbotConnectCardProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const { user } = useAuth()
  const canConnect = Number.isInteger(analysisResultId) && Number(analysisResultId) > 0

  const handleAskWithResult = () => {
    if (analysisResult) {
      writeSelectedChatbotAnalysisContext(buildChatbotContextFromAnalysis(analysisResult, "current"), user?.id ?? null)
    }
    router.push(canConnect ? buildAnalysisChatbotHref(Number(analysisResultId)) : ROUTES.CHATBOT)
  }

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
      <button
        type="button"
        className={styles.smallPillButton}
        onClick={handleAskWithResult}
      >
        {t.chatbot.askWithResult}
      </button>
    </section>
  )
}
