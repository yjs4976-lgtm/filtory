"use client"

import Link from "next/link"
import { Clock3, MapPin } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import type { RecentViewedHospital } from "@/lib/types"
import { categoryLabels, formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface RecentViewedHospitalsProps {
  hospitals: RecentViewedHospital[]
}

export function RecentViewedHospitals({ hospitals }: RecentViewedHospitalsProps) {
  const preview = hospitals.slice(0, 3)

  return (
    <section className={styles.stackSm}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.titleSm}>최근 본 병원</h2>
        <Link href={ROUTES.MYPAGE_RECENT} className={styles.seeAllButton}>
          전체 보기
        </Link>
      </div>
      {preview.length === 0 ? (
        <article className={`${styles.emptyCard} ${styles.stackSm}`}>
          <h3 className={styles.titleMd}>최근 본 병원이 없어요</h3>
          <p className={styles.bodyText}>관심 있는 병원을 확인하면 이곳에 표시돼요.</p>
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
                  {categoryLabels[hospital.category]} · {hospital.viewedAt}
                </span>
                <span className={styles.recordMeta}>
                  <MapPin className={styles.iconXs} /> {hospital.address} · {formatStars(hospital.globalAccessRating)}
                </span>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
