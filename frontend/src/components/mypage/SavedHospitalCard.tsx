"use client"

import Link from "next/link"
import { GitCompareArrows, Trash2 } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import type { SavedHospital } from "@/lib/types"
import { categoryLabels, formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface SavedHospitalCardProps {
  hospital: SavedHospital
  onAddToCompare: (id: number) => void
  onUnsave: (id: number) => void
}

export function SavedHospitalCard({ hospital, onAddToCompare, onUnsave }: SavedHospitalCardProps) {
  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{hospital.hospitalName}</h2>
          <p className={styles.bodyText}>
            {categoryLabels[hospital.category]} · {hospital.address}
          </p>
        </div>
        <strong className={styles.scoreSmall}>{hospital.trustScore}점</strong>
      </div>
      <div className={styles.metricGrid}>
        <span>신뢰도 {hospital.trustLevel}</span>
        <span>광고 의심 {hospital.adSuspicionLevel}</span>
        <span>정보 완성도 {hospital.infoCompletenessScore}점</span>
        <span>글로벌 {formatStars(hospital.globalAccessRating)}</span>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.RESULT} className={styles.secondaryButton}>
          상세 보기
        </Link>
        <button type="button" className={styles.secondaryButton} onClick={() => onAddToCompare(hospital.id)}>
          <GitCompareArrows className={styles.iconSm} />
          비교함 추가
        </button>
      </div>
      <button type="button" className={styles.dangerButton} onClick={() => onUnsave(hospital.id)}>
        <Trash2 className={styles.iconSm} />
        저장 해제
      </button>
    </article>
  )
}
