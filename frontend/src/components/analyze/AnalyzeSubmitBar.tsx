"use client"

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function AnalyzeSubmitBar({
  canPrev,
  canNext,
  canSubmit,
  onPrev,
  onNext,
  onSubmit,
}: {
  canPrev: boolean
  canNext: boolean
  canSubmit: boolean
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className={styles.submitBar}>
      <button type="button" className={styles.secondaryButton} disabled={!canPrev} onClick={onPrev}>
        <ArrowLeft className={styles.iconSm} />
        {t.analyze.previous}
      </button>
      {canNext ? (
        <button type="button" className={styles.primaryButton} onClick={onNext}>
          {t.analyze.nextStep}
          <ArrowRight className={styles.iconSm} />
        </button>
      ) : (
        <button type="button" className={styles.primaryButton} disabled={!canSubmit} onClick={onSubmit}>
          <Sparkles className={styles.iconSm} />
          {t.analyze.submit}
        </button>
      )}
    </div>
  )
}
