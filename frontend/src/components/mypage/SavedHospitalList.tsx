"use client"

import Link from "next/link"
import { Bookmark } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { SavedHospital } from "@/lib/types"
import { formatFivePointRating } from "@/services/memberMockData"
import { SavedHospitalCard } from "./SavedHospitalCard"
import styles from "@/styles/App.module.css"

interface SavedHospitalListProps {
  hospitals?: SavedHospital[]
  preview?: boolean
  onAddToCompare?: (id: number) => void
  onUnsave?: (id: number) => void
}

export function SavedHospitalList({ hospitals = [], preview = true, onAddToCompare, onUnsave }: SavedHospitalListProps) {
  const { t } = useLanguage()
  const displayHospitals = preview ? hospitals.slice(0, 3) : hospitals

  return (
    <section className={styles.stackSm}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.titleSm}>{t.mypage.savedHospitals}</h2>
        {preview && (
          <Link href={ROUTES.MYPAGE_SAVED} className={styles.seeAllButton}>
            {t.mypage.seeAll}
          </Link>
        )}
      </div>
      {displayHospitals.length === 0 ? (
        <article className={`${styles.emptyCard} ${styles.stackSm}`}>
          <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
            <Bookmark className={styles.iconSm} />
          </span>
          <div>
            <h3 className={styles.titleMd}>{t.mypage.emptySavedTitle}</h3>
            <p className={styles.bodyText}>{t.mypage.emptySavedDescription}</p>
          </div>
        </article>
      ) : (
        <div className={styles.recordList}>
          {displayHospitals.map((hospital) =>
            preview ? (
              <article key={hospital.id} className={styles.recordButton}>
                <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
                  <Bookmark className={styles.iconSm} />
                </span>
                <span className={styles.recordBody}>
                  <strong className={styles.recordName}>{hospital.hospitalName}</strong>
                  <span className={styles.recordDate}>
                    {t.categories[hospital.category]} · {t.mypage.latestTrust} {hospital.trustScore}
                    {t.mypage.pointsSuffix}
                  </span>
                  <span className={styles.recordMeta}>
                    {t.mypage.globalAccess} {formatFivePointRating(hospital.globalAccessRating)} · {hospital.address}
                  </span>
                </span>
              </article>
            ) : (
              <SavedHospitalCard
                key={hospital.id}
                hospital={hospital}
                onAddToCompare={onAddToCompare ?? (() => undefined)}
                onUnsave={onUnsave ?? (() => undefined)}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
