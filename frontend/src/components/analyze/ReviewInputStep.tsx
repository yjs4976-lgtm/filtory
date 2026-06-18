"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ReviewInputStep({
  review,
  onReviewChange,
}: {
  review: string
  onReviewChange: (value: string) => void
}) {
  const { t } = useLanguage()

  return (
    <div className={styles.stackSm}>
      <label className={styles.label} htmlFor="review">{t.analyze.reviewLabel}</label>
      <textarea
        id="review"
        value={review}
        onChange={(event) => onReviewChange(event.target.value)}
        placeholder={t.analyze.reviewPlaceholder}
        className={styles.textarea}
      />
      <div className={`${styles.softCard} ${styles.mutedText}`}>
        {t.analyze.uploadPlaceholder}
      </div>
    </div>
  )
}
