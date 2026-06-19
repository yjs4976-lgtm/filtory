"use client"

import Link from "next/link"
import { FileSearch } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function AnalysisHistoryEmpty() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <FileSearch className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.emptyRecentTitle}</h2>
      <p className={styles.bodyText}>{t.mypage.emptyRecentDescription}</p>
      <Link href={ROUTES.ANALYZE} className={styles.primaryButton}>
        {t.mypage.startAnalysis}
      </Link>
    </section>
  )
}
