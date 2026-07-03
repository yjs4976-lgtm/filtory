"use client"

import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { TRUST_LEVEL_STANDARDS } from "@/lib/score"
import styles from "@/styles/App.module.css"

export function TrustLevelGuide() {
  const { t } = useLanguage()

  return (
    <details className={styles.trustGuide}>
      <summary className={styles.trustGuideSummary}>
        <span>
          <strong>{t.mypage.trustGuideTitle}</strong>
          <small>{t.mypage.trustGuideDescription}</small>
        </span>
        <span className={styles.trustGuideToggle}>{t.mypage.trustGuideSummary}</span>
      </summary>
      <div className={styles.trustGuideGrid}>
        {TRUST_LEVEL_STANDARDS.map((level) => (
          <div key={level.key} className={styles.trustGuideItem}>
            <span className={styles.trustShield} style={{ backgroundColor: level.softColor, color: level.color }}>
              <ShieldCheck className={styles.iconSm} />
            </span>
            <span className={styles.trustGuideText}>
              <strong>{t.trustLevels[level.key]}</strong>
              <small>
                {level.min}-{level.max}
                {t.common.pointsSuffix} · {t.trustLevelDescriptions[level.key]}
              </small>
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}
