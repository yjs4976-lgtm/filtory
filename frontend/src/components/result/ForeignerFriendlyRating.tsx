"use client"

import { Globe2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { calculateForeignerFriendlyScore } from "@/lib/score"
import type { ForeignerFriendlyCheck } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function ForeignerFriendlyRating({ checks }: { checks: ForeignerFriendlyCheck }) {
  const { t } = useLanguage()
  const result = calculateForeignerFriendlyScore(
    checks,
    t.result.foreignerCheckedLabels,
    t.result.foreignerMissingLabels
  )
  const message =
    result.checkedCount >= 4
      ? t.result.foreignerMessages.high
      : result.checkedCount >= 3
        ? t.result.foreignerMessages.medium
        : t.result.foreignerMessages.low

  return (
    <section className={`${styles.foreignerRatingCard} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div className={styles.row}>
          <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
            <Globe2 className={styles.iconSm} />
          </span>
          <h2 className={styles.titleSm}>{t.result.foreignerScore}</h2>
        </div>
        <strong className={styles.foreignerScoreText}>{result.score}{t.result.pointsSuffix}</strong>
      </div>

      <div className={styles.foreignerStars} aria-label={`${result.stars}/5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < result.stars ? styles.starFilled : styles.starEmpty}>
            ★
          </span>
        ))}
        <strong>{result.score}{t.result.pointsSuffix}</strong>
      </div>

      <p className={styles.mutedText}>{message}</p>

      <div className={styles.foreignerChecklistGrid}>
        <div>
          <p className={styles.checklistTitle}>{t.result.checkedItems}</p>
          <ul className={styles.compactList}>
            {result.checkedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className={styles.checklistTitle}>{t.result.missingItems}</p>
          <ul className={styles.compactList}>
            {result.missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
