"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ReviewInputBox({ value, onChange }) {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="review-input">{t.analyze.reviewLabel}</label>
      <textarea id="review-input" className={styles.textarea} value={value} onChange={(event) => onChange(event.target.value)} placeholder={t.analyze.reviewPlaceholder} />
    </section>
  )
}
