"use client"

import { Clock3 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function RecentViewedHospitalEmpty() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
        <Clock3 className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.emptyRecentViewedTitle}</h2>
      <p className={styles.bodyText}>{t.mypage.emptyRecentViewedDescription}</p>
    </section>
  )
}
