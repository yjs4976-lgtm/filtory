"use client"

import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function Loading() {
  const { t } = useLanguage()

  return (
    <main className={styles.loadingPage}>
      <LoadingSpinner label={t.common.loading} />
    </main>
  )
}
