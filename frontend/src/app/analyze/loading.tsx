"use client"

import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function AnalyzeLoading() {
  const { t } = useLanguage()

  return (
    <main className={styles.loadingPage}>
      <LoadingSpinner label={t.analyze.loading} />
    </main>
  )
}
