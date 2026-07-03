"use client"

import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { writeCurrentReviewAnalysisFromHistory } from "@/lib/analysisStorage"
import { formatDisplayDate } from "@/lib/dateFormat"
import { getHistoryHospitalName, getHistoryMetaText } from "@/lib/historyDisplay"
import { ROUTES } from "@/lib/routes"
import { getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import type { AnalysisHistoryItem } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function HistoryCard({ item }: { item: AnalysisHistoryItem }) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const name = getHistoryHospitalName(item, language)
  const metaText = getHistoryMetaText(item, language, t.categories[item.category])
  const date = formatDisplayDate(item.analyzedAt ?? item.createdAt, language) || t.mypage.noRecentDate
  const trustScore = item.trustScore ?? item.score
  const trustLevel = getTrustLevel(trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(trustScore, item.trustLevel)
  const viewResult = () => {
    writeCurrentReviewAnalysisFromHistory(item)
    router.push(ROUTES.RESULT)
  }

  return (
    <button type="button" className={styles.recordButton} onClick={viewResult}>
      <div className={styles.recordBody}>
        <p className={styles.recordName}>{name}</p>
        <p className={styles.recordDate}>
          {metaText} · {date}
        </p>
        <span className={styles.inlineTrustLabel}>
          <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
          {t.trustLevels[trustLevelKey]}
        </span>
      </div>
      <span className={styles.score}>{trustScore}</span>
    </button>
  )
}
