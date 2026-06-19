"use client"

import Link from "next/link"
import { ShieldCheck, Trash2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import { formatSignalLevel, getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import type { AnalysisHistoryItem } from "@/lib/types"
import { formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface AnalysisHistoryCardProps {
  item: AnalysisHistoryItem
  onDelete: (id: string) => void
}

export function AnalysisHistoryCard({ item, onDelete }: AnalysisHistoryCardProps) {
  const { t } = useLanguage()
  const trustScore = item.trustScore ?? item.score
  const trustLevel = getTrustLevel(trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(trustScore, item.trustLevel)
  const adSuspicionLevel = formatSignalLevel(item.adSuspicionLevel, {
    low: t.analyze.low,
    medium: t.analyze.medium,
    high: t.analyze.high,
    caution: t.analyze.caution,
  })
  const date = item.analyzedAt ?? item.createdAt

  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{item.hospitalName}</h2>
          <p className={styles.bodyText}>
            {t.categories[item.category]} · {date}
          </p>
        </div>
        <span className={styles.scoreSmall}>{trustScore}{t.mypage.pointsSuffix}</span>
      </div>
      <div className={styles.metricGrid}>
        <span className={styles.trustMetric}>
          <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
          {t.mypage.trustScoreLabel} {t.trustLevels[trustLevelKey]}
        </span>
        <span>{t.mypage.adSuspicionLabel} {adSuspicionLevel}</span>
        <span>{t.mypage.infoCompletenessLabel} {item.infoCompletenessScore ?? 0}{t.mypage.pointsSuffix}</span>
        <span>{t.mypage.globalLabel} {formatStars(item.globalAccessRating)}</span>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.RESULT} className={styles.secondaryButton}>
          {t.mypage.viewResult}
        </Link>
        <button type="button" className={styles.dangerButton} onClick={() => onDelete(item.id)}>
          <Trash2 className={styles.iconSm} />
          {t.mypage.deleteRecord}
        </button>
      </div>
    </article>
  )
}
