"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function AdminReviewTable() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.admin.reviewsTitle}</h2>
      <p className={styles.mutedText}>{t.admin.reviewsDescription}</p>
    </section>
  )
}
