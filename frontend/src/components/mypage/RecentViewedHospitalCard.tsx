"use client"

import Link from "next/link"
import { Bookmark, Trash2 } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import type { RecentViewedHospital } from "@/lib/types"
import { categoryLabels, formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface RecentViewedHospitalCardProps {
  hospital: RecentViewedHospital
  onSave: (id: number) => void
  onDelete: (id: number) => void
}

export function RecentViewedHospitalCard({ hospital, onSave, onDelete }: RecentViewedHospitalCardProps) {
  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div>
        <h2 className={styles.titleMd}>{hospital.hospitalName}</h2>
        <p className={styles.bodyText}>
          {categoryLabels[hospital.category]} · {hospital.address}
        </p>
        <p className={styles.recordMeta}>
          최근 본 날짜 {hospital.viewedAt} · {hospital.trustLevel ?? "분석 전"} · {formatStars(hospital.globalAccessRating)}
        </p>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.ANALYZE} className={styles.secondaryButton}>
          다시 분석하기
        </Link>
        <button type="button" className={styles.secondaryButton} onClick={() => onSave(hospital.id)}>
          <Bookmark className={styles.iconSm} />
          저장하기
        </button>
      </div>
      <button type="button" className={styles.dangerButton} onClick={() => onDelete(hospital.id)}>
        <Trash2 className={styles.iconSm} />
        기록 삭제
      </button>
    </article>
  )
}
