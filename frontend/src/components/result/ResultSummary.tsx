"use client"

import { mockAnalysisResult } from "@/lib/mockData"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ResultSummary() {
  const { t, language } = useLanguage()

  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.result.overallSummaryTitle}</h2>
      <p className={styles.bodyText}>{mockAnalysisResult.summary[language]}</p>
    </section>
  )
}
