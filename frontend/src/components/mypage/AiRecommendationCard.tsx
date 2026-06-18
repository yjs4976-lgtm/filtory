"use client"

import Link from "next/link"
import { Bot } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface AiRecommendationCardProps {
  records: AnalysisHistoryItem[]
}

export function AiRecommendationCard({ records }: AiRecommendationCardProps) {
  const { t } = useLanguage()
  const hasRecords = records.length > 0

  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <Bot className={styles.iconSm} />
      </span>
      <div>
        <p className={styles.memberEyebrow}>{t.mypage.aiRecommendation}</p>
        <h2 className={styles.titleMd}>{hasRecords ? t.mypage.aiWithHistoryTitle : t.mypage.aiNoHistoryTitle}</h2>
        <p className={styles.bodyText}>
          {hasRecords ? t.mypage.aiWithHistoryDescription : t.mypage.aiNoHistoryDescription}
        </p>
      </div>
      <Link href={hasRecords ? ROUTES.CHATBOT : ROUTES.ANALYZE} className={styles.primaryButton}>
        {hasRecords ? t.mypage.askChatbot : t.mypage.startAnalysis}
      </Link>
    </section>
  )
}
