"use client"

import { ChevronRight } from "lucide-react"
import { HistoryList } from "@/components/history/HistoryList"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function RecentAnalysisSection() {
  const { t } = useLanguage()

  return (
    <section className={styles.stackSm}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.titleSm}>{t.home.recentTitle}</h2>
        <a href={ROUTES.HISTORY} className={styles.seeAllLink}>
          {t.home.seeAll}
          <ChevronRight className={styles.iconXs} />
        </a>
      </div>
      <HistoryList compact previewLimit={5} showPreviewSummary />
    </section>
  )
}
