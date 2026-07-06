"use client"

import Link from "next/link"
import { Clock3, MapPin } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { RecentViewedHospital } from "@/lib/types"
import { formatFivePointRating } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface RecentViewedHospitalsProps {
  hospitals: RecentViewedHospital[]
}

export function RecentViewedHospitals({ hospitals }: RecentViewedHospitalsProps) {
  const { t } = useLanguage()
  const preview = hospitals.slice(0, 3)

  return (
    <section className={styles.stackSm}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.titleSm}>{t.mypage.recentViewedHospitals}</h2>
        <Link href={ROUTES.MYPAGE_RECENT} className={styles.seeAllButton}>
          {t.mypage.seeAll}
        </Link>
      </div>
      {preview.length === 0 ? (
        <article className={`${styles.emptyCard} ${styles.stackSm}`}>
          <h3 className={styles.titleMd}>{t.mypage.emptyRecentViewedTitle}</h3>
          <p className={styles.bodyText}>{t.mypage.emptyRecentViewedDescription}</p>
        </article>
      ) : (
        <div className={styles.recordList}>
          {preview.map((hospital) => (
            <article key={hospital.id} className={styles.recordButton}>
              <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
                <Clock3 className={styles.iconSm} />
              </span>
              <span className={styles.recordBody}>
                <strong className={styles.recordName}>{hospital.hospitalName}</strong>
                <span className={styles.recordDate}>
                  {t.categories[hospital.category]} · {hospital.viewedAt}
                </span>
                <span className={styles.recordMeta}>
                  <MapPin className={styles.iconXs} /> {hospital.address} · {t.mypage.globalAccess}{" "}
                  {formatFivePointRating(hospital.globalAccessRating)}
                </span>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
