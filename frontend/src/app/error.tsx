"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function Error({ reset }) {
  const { t } = useLanguage()

  return (
    <main className={`${styles.main} ${styles.stackSm}`}>
      <h1 className={styles.titleLg}>{t.common.errorTitle}</h1>
      <p className={styles.bodyText}>{t.common.errorDescription}</p>
      <button type="button" className={styles.primaryButton} onClick={reset}>{t.common.retry}</button>
    </main>
  )
}
