"use client"

import Link from "next/link"
import { ShieldCheck, Trash2 } from "lucide-react"
import { FavoriteHospitalButton } from "@/components/favorites/FavoriteHospitalButton"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import { getTrustLevelByKey, getTrustLevelKeyFromValue } from "@/lib/score"
import type { RecentViewedHospital } from "@/lib/types"
import { formatFivePointRating } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface RecentViewedHospitalCardProps {
  hospital: RecentViewedHospital
  onDelete: (id: number) => void
  onFavoriteChange: (id: number, favorite: boolean) => void
}

export function RecentViewedHospitalCard({ hospital, onDelete, onFavoriteChange }: RecentViewedHospitalCardProps) {
  const { t } = useLanguage()
  const trustLevelKey = hospital.trustLevel ? getTrustLevelKeyFromValue(undefined, hospital.trustLevel) : undefined
  const trustLevel = trustLevelKey ? getTrustLevelByKey(trustLevelKey) : undefined

  return (
    <article className={`${styles.card} ${styles.stackSm} ${styles.recentHospitalCard}`}>
      <FavoriteHospitalButton hospital={{ id: String(hospital.id), internalHospitalId: hospital.id, provider: hospital.sourceProvider || "filtory", externalPlaceId: hospital.externalPlaceId, name: hospital.hospitalName, category: hospital.category, region: "seoul", address: hospital.address, roadAddress: hospital.roadAddress, phone: hospital.phone, mapUrl: hospital.mapUrl }} initialFavorite={hospital.isFavorite} favoriteHospitalId={hospital.isFavorite ? hospital.id : undefined} iconOnly className={styles.recentHospitalFavorite} onChange={(favorite) => onFavoriteChange(hospital.id, favorite)}/>
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
          {formatFivePointRating(hospital.globalAccessRating)}
        </p>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.ANALYZE} className={styles.secondaryButton}>
          {t.mypage.analyzeAgain}
        </Link>
      </div>
      <button type="button" className={styles.dangerButton} onClick={() => onDelete(hospital.id)}>
        <Trash2 className={styles.iconSm} />
        {t.mypage.deleteRecord}
      </button>
    </article>
  )
}
