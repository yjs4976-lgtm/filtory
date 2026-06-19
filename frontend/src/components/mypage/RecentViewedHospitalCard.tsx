"use client"

import Link from "next/link"
import { Bookmark, ShieldCheck, Trash2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import { getTrustLevelByKey, getTrustLevelKeyFromValue } from "@/lib/score"
import type { RecentViewedHospital } from "@/lib/types"
import { formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface RecentViewedHospitalCardProps {
  hospital: RecentViewedHospital
  onSave: (id: number) => void
  onDelete: (id: number) => void
}

export function RecentViewedHospitalCard({ hospital, onSave, onDelete }: RecentViewedHospitalCardProps) {
  const { t } = useLanguage()
  const trustLevelKey = hospital.trustLevel ? getTrustLevelKeyFromValue(undefined, hospital.trustLevel) : undefined
  const trustLevel = trustLevelKey ? getTrustLevelByKey(trustLevelKey) : undefined

  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div>
        <h2 className={styles.titleMd}>{hospital.hospitalName}</h2>
        <p className={styles.bodyText}>
          {t.categories[hospital.category]} · {hospital.address}
        </p>
        <p className={styles.recordMeta}>
          {t.mypage.recentViewedDate} {hospital.viewedAt} ·{" "}
          {trustLevelKey && trustLevel ? (
            <span className={styles.inlineTrustLabel}>
              <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
              {t.trustLevels[trustLevelKey]}
            </span>
          ) : (
            t.mypage.notAnalyzed
          )}{" "}
          ·{" "}
          {formatStars(hospital.globalAccessRating)}
        </p>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.ANALYZE} className={styles.secondaryButton}>
          {t.mypage.analyzeAgain}
        </Link>
        <button type="button" className={styles.secondaryButton} onClick={() => onSave(hospital.id)}>
          <Bookmark className={styles.iconSm} />
          {t.mypage.saveHospital}
        </button>
      </div>
      <button type="button" className={styles.dangerButton} onClick={() => onDelete(hospital.id)}>
        <Trash2 className={styles.iconSm} />
        {t.mypage.deleteRecord}
      </button>
    </article>
  )
}
