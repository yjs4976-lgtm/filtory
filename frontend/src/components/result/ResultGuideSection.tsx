"use client"

import { FileText, Info, RotateCcw, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import type { AnalysisResultViewModel } from "@/lib/analysisResultMapper"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

type ResultGuideSectionProps = {
  viewModel: AnalysisResultViewModel
}

export function ResultGuideSection({ viewModel }: ResultGuideSectionProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const label = t.result.guide
  const warnings = Array.from(new Set([...viewModel.signals.negativeSignals, ...viewModel.signals.warningSignals]))

  return (
    <>
      <section className={`${styles.accentCard} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Sparkles className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.summary}</h2>
        </div>
        <p className={styles.summaryText}>{viewModel.content.summary}</p>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Info className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.visitTip}</h2>
        </div>
        <p className={styles.summaryText}>{viewModel.content.visitTip}</p>
        <div className={styles.resultGuideNote}>
          <strong>{label.recommendation}</strong>
          <p>{viewModel.content.recommendation}</p>
        </div>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <FileText className={`${styles.iconSm} ${styles.mintText}`} />
          <h2 className={styles.titleSm}>{label.warning}</h2>
        </div>
        {warnings.length > 0 ? (
          <ul className={styles.list}>
            {warnings.map((item) => (
              <li key={item} className={`${styles.listItem} ${styles.bgPeach}`}>
                <span className={`${styles.listDot} ${styles.fillGold}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.resultEmptyText}>{label.noWarning}</p>
        )}
      </section>

      <div className={styles.note}>
        <Info className={styles.iconXs} />
        <span>{label.reference}</span>
      </div>

      <div className={styles.stackSm}>
        <button type="button" className={styles.primaryButton}>
          <FileText className={styles.iconSm} />
          {label.detail}
        </button>
        <button type="button" onClick={() => router.push(ROUTES.ANALYZE)} className={styles.secondaryButton}>
          <RotateCcw className={styles.iconSm} />
          {t.result.retryCta}
        </button>
      </div>
    </>
  )
}
