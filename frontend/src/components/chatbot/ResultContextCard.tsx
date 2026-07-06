"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import {
  buildChatbotContextFromAnalysis,
  writeSelectedChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { formatDisplayDate } from "@/lib/dateFormat"
import { getHistoryHospitalName, getHistoryMetaText } from "@/lib/historyDisplay"
import type { AnalysisHistoryItem } from "@/lib/types"
import { getHistory } from "@/services/historyService"
import styles from "@/styles/App.module.css"

export function ResultContextCard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t, language } = useLanguage()
  const [latest, setLatest] = useState<AnalysisHistoryItem | null>(null)

  useEffect(() => {
    let alive = true

    if (isLoading || !isAuthenticated) return

    getHistory(user?.id).then((records) => {
      if (alive) setLatest(records[0] ?? null)
    })

    return () => {
      alive = false
    }
  }, [isAuthenticated, isLoading, user?.id])

  if (!isLoading && !isAuthenticated) {
    return (
      <LoginRequiredCard
        title={t.chatbot.savedResultTitle}
        description={t.chatbot.savedResultDescription}
        showSignup={false}
        secondaryLabel={t.chatbot.analyzeFirst}
      />
    )
  }

  const askWithLatestResult = () => {
    if (!latest) return
    writeSelectedChatbotAnalysisContext(buildChatbotContextFromAnalysis(latest), user?.id ?? null)
  }
  const latestHospitalName = latest ? getHistoryHospitalName(latest, language) : ""
  const latestMetaText = latest ? getHistoryMetaText(latest, language, t.categories[latest.category]) : ""

  return (
    <section className={`${styles.softCard} ${styles.rowBetween}`}>
      <div className={styles.row}>
        <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
          <FileText className={styles.iconSm} />
        </span>
        <div>
          <p className={styles.titleSm}>{latest ? latestHospitalName : t.chatbot.noLinkedResult}</p>
          <p className={styles.mutedText}>
            {latest
              ? `${latestMetaText} · ${latest.score}${t.result.pointsSuffix} · ${formatDisplayDate(latest.analyzedAt ?? latest.createdAt, language)}`
              : t.chatbot.noLinkedResultDescription}
          </p>
        </div>
      </div>
      {latest && (
        <button
          type="button"
          className={styles.smallPillButton}
          onClick={askWithLatestResult}
        >
          {t.chatbot.askWithResult}
        </button>
      )}
    </section>
  )
}
