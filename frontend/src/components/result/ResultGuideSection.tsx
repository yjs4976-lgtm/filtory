"use client"

import { FileText, Info, RotateCcw, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useLanguage } from "@/context/LanguageContext"
import type { AnalysisResultViewModel } from "@/lib/analysisResultMapper"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

type ResultGuideSectionProps = {
  viewModel: AnalysisResultViewModel
}

function ResultAccordion({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <details className={styles.resultAccordion}>
      <summary className={styles.resultAccordionSummary}>
        <span className={styles.row}>
          {icon}
          <strong>{title}</strong>
        </span>
      </summary>
      <div className={styles.resultAccordionBody}>{children}</div>
    </details>
  )
}

export function ResultGuideSection({ viewModel }: ResultGuideSectionProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const label = t.result.guide
  const warnings = Array.from(new Set([...viewModel.signals.negativeSignals, ...viewModel.signals.warningSignals]))

  return (
    <section className={styles.resultAccordionList}>
      <ResultAccordion
        title={label.summaryDetail}
        icon={<Sparkles className={`${styles.iconSm} ${styles.iconPrimary}`} />}
      >
        <p className={styles.summaryText}>{viewModel.content.summary}</p>
      </ResultAccordion>

      <ResultAccordion
        title={label.visitTip}
        icon={<Info className={`${styles.iconSm} ${styles.iconPrimary}`} />}
      >
        <p className={styles.summaryText}>{viewModel.content.visitTip}</p>
        <div className={styles.resultGuideNote}>
          <strong>{label.recommendation}</strong>
          <p>{viewModel.content.recommendation}</p>
        </div>
      </ResultAccordion>

      <ResultAccordion
        title={label.warningDetail}
        icon={<FileText className={`${styles.iconSm} ${styles.mintText}`} />}
      >
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
      </ResultAccordion>

      <div className={styles.note}>
        <Info className={styles.iconXs} />
        <span>{label.reference}</span>
      </div>

      <div className={styles.stackSm}>
        <button type="button" onClick={() => router.push(ROUTES.ANALYZE)} className={styles.secondaryButton}>
          <RotateCcw className={styles.iconSm} />
          {t.result.retryCta}
        </button>
      </div>
    </section>
  )
}
