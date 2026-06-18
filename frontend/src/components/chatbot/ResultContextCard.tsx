"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import type { AnalysisHistoryItem } from "@/lib/types"
import { getHistory } from "@/services/historyService"
import styles from "@/styles/App.module.css"

export function ResultContextCard() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [latest, setLatest] = useState<AnalysisHistoryItem | null>(null)

  useEffect(() => {
    let alive = true

    if (isLoading || !isAuthenticated) return

    getHistory().then((records) => {
      if (alive) setLatest(records[0] ?? null)
    })

    return () => {
      alive = false
    }
  }, [isAuthenticated, isLoading])

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

  return (
    <section className={`${styles.softCard} ${styles.rowBetween}`}>
      <div className={styles.row}>
        <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
          <FileText className={styles.iconSm} />
        </span>
        <div>
          <p className={styles.titleSm}>{latest ? latest.hospitalName : t.chatbot.noLinkedResult}</p>
          <p className={styles.mutedText}>
            {latest
              ? `${latest.score}${t.result.pointsSuffix} · ${latest.createdAt}`
              : t.chatbot.noLinkedResultDescription}
          </p>
        </div>
      </div>
      {latest && <button className={styles.smallPillButton}>{t.chatbot.askWithResult}</button>}
    </section>
  )
}
