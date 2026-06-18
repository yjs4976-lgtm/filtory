"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function HistoryCard({ item }: { item: AnalysisHistoryItem }) {
  const router = useRouter()
  const { t } = useLanguage()
  const name = item.hospitalName
  const date = item.createdAt || "날짜 없음"
  const foreignerStars =
    typeof item.foreignerFriendlyScore === "number"
      ? Math.max(0, Math.min(5, Math.round(item.foreignerFriendlyScore / 20)))
      : 0

  return (
    <button type="button" className={styles.recordButton} onClick={() => router.push(ROUTES.RESULT)}>
      <div className={styles.recordBody}>
        <p className={styles.recordName}>{name}</p>
        <p className={styles.recordDate}>{date}</p>
        {typeof item.foreignerFriendlyScore === "number" && (
          <p className={styles.recordMeta}>
            {"★".repeat(foreignerStars).padEnd(5, "☆")} {item.foreignerFriendlyScore}
            {t.result.pointsSuffix}
          </p>
        )}
      </div>
      <span className={styles.score}>{item.score}</span>
    </button>
  )
}
