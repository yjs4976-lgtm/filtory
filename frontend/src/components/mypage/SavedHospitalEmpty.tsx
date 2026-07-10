"use client"

import Link from "next/link"
import { Bookmark } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function SavedHospitalEmpty() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <Bookmark className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.emptySavedTitle}</h2>
      <p className={styles.bodyText}>{t.mypage.savedHospitalDescription}</p>
      <Link href={ROUTES.ANALYZE} className={styles.primaryButton}>
        {t.mypage.startAnalysis}
      </Link>
    </section>
  )
}
