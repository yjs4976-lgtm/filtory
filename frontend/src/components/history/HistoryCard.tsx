"use client"

import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { formatDisplayDate } from "@/lib/dateFormat"
import { ROUTES } from "@/lib/routes"
import { getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import type { AnalysisHistoryItem } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function HistoryCard({ item }: { item: AnalysisHistoryItem }) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const name = item.hospitalName
  const date = formatDisplayDate(item.analyzedAt ?? item.createdAt, language) || t.mypage.noRecentDate
  const trustScore = item.trustScore ?? item.score
  const trustLevel = getTrustLevel(trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(trustScore, item.trustLevel)
  const foreignerStars =
    typeof item.foreignerFriendlyScore === "number"
      ? Math.max(0, Math.min(5, Math.round(item.foreignerFriendlyScore / 20)))
      : 0

  return (
    <button type="button" className={styles.recordButton} onClick={() => router.push(ROUTES.RESULT)}>
      <div className={styles.recordBody}>
        <p className={styles.recordName}>{name}</p>
        <p className={styles.recordDate}>{date}</p>
        <p className={styles.recordMeta}>
          <span className={styles.inlineTrustLabel}>
            <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
            {t.trustLevels[trustLevelKey]}
          </span>
        </p>
        {typeof item.foreignerFriendlyScore === "number" && (
          <p className={styles.recordMeta}>
            {"★".repeat(foreignerStars).padEnd(5, "☆")} {item.foreignerFriendlyScore}
            {t.result.pointsSuffix}
          </p>
        )}
      </div>
      <span className={styles.score}>{trustScore}</span>
    </button>
  )
}
