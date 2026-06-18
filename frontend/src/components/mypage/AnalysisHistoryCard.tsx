"use client"

import Link from "next/link"
import { Trash2 } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem } from "@/lib/types"
import { categoryLabels, formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface AnalysisHistoryCardProps {
  item: AnalysisHistoryItem
  onDelete: (id: string) => void
}

export function AnalysisHistoryCard({ item, onDelete }: AnalysisHistoryCardProps) {
  const trustScore = item.trustScore ?? item.score
  const date = item.analyzedAt ?? item.createdAt

  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{item.hospitalName}</h2>
          <p className={styles.bodyText}>
            {categoryLabels[item.category]} · {date}
          </p>
        </div>
        <span className={styles.scoreSmall}>{trustScore}점</span>
      </div>
      <div className={styles.metricGrid}>
        <span>리뷰 신뢰도 {item.trustLevel ?? "보통"}</span>
        <span>광고 의심 {item.adSuspicionLevel ?? "낮음"}</span>
        <span>정보 완성도 {item.infoCompletenessScore ?? 0}점</span>
        <span>글로벌 접근성 {formatStars(item.globalAccessRating)}</span>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.RESULT} className={styles.secondaryButton}>
          분석 결과 보기
        </Link>
        <button type="button" className={styles.dangerButton} onClick={() => onDelete(item.id)}>
          <Trash2 className={styles.iconSm} />
          기록 삭제
        </button>
      </div>
    </article>
  )
}
