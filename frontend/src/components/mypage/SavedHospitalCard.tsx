"use client"

import Link from "next/link"
import { ShieldCheck, Trash2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import { formatSignalLevel, getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import type { SavedHospital } from "@/lib/types"
import { formatFivePointRating } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface SavedHospitalCardProps {
  hospital: SavedHospital
  onUnsave: (id: number) => void
}

export function SavedHospitalCard({ hospital, onUnsave }: SavedHospitalCardProps) {
  const { t } = useLanguage()
  const trustLevel = getTrustLevel(hospital.trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(hospital.trustScore, hospital.trustLevel)
  const adSuspicionLevel = formatSignalLevel(hospital.adSuspicionLevel, {
    low: t.analyze.low,
    medium: t.analyze.medium,
    high: t.analyze.high,
    caution: t.analyze.caution,
  })

  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{hospital.hospitalName}</h2>
          <p className={styles.bodyText}>
            {t.categories[hospital.category]} · {hospital.address}
          </p>
        </div>
        <strong className={styles.scoreSmall}>{hospital.trustScore}{t.mypage.pointsSuffix}</strong>
      </div>
      <div className={styles.metricGrid}>
        <span className={styles.trustMetric}>
          <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
          {t.mypage.trustScoreLabel} {t.trustLevels[trustLevelKey]}
        </span>
        <span>{t.mypage.adSuspicionLabel} {adSuspicionLevel}</span>
        <span>{t.mypage.infoCompletenessLabel} {hospital.infoCompletenessScore}{t.mypage.pointsSuffix}</span>
        <span>{t.mypage.globalLabel} {formatFivePointRating(hospital.globalAccessRating)}</span>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.RESULT} className={styles.secondaryButton}>
          {t.mypage.detailView}
        </Link>
      </div>
      <button type="button" className={styles.dangerButton} onClick={() => onUnsave(hospital.id)}>
        <Trash2 className={styles.iconSm} />
        {t.mypage.unsave}
      </button>
    </article>
  )
}
